/* SOUND SHELF - script.js
   Organização:
   - Constantes
   - Armazenamento
   - Utilitários
   - Usuários e sessão
   - Coleções
   - Utilitários de Formulário
   - Senhas e Contas
   - Cabeçalho e Proteção de Páginas
   - Cadastro e login
   - Listagem coleções
   - Inicialização

   Modelos:
   Usuário: { id, nome, email, senhaHash, sal, criadoEm }
   Coleção: { id, usuarioId, nome, descricao, tipo, criadaEm, itens: [] }
   Item: { idExterno, titulo, artista, capa, ano, genero }
*/


// ----- Constantes -----

const CHAVES = {
    usuarios: "soundshelf:usuarios",
    sessao: "soundshelf:sessao",
    colecoes: "soundshelf:colecoes",
};

const TIPOS_COLECAO = ["musicas", "albuns"];


// ----- Armazenamento -----

/** Lê um valor salvo ou retorna o padrão caso ocorra algum erro. */
function lerStorage(chave, valorPadrao, armazenamento = localStorage) {
    try {
        const texto = armazenamento.getItem(chave);

        if (texto === null) {
            return valorPadrao;
        }

        return JSON.parse(texto);
    } catch (erro) {
        console.error(`Não foi possível ler "${chave}":`, erro);
        return valorPadrao;
    }
}

/** Salva um valor e retorna se a operação foi bem-sucedida. */
function gravarStorage(chave, valor, armazenamento = localStorage) {
    try {
        armazenamento.setItem(chave, JSON.stringify(valor));
        return true;
    } catch (erro) {
        console.error(`Não foi possível gravar "${chave}":`, erro);
        return false;
    }
}

function removerStorage(chave, armazenamento = localStorage) {
    try {
        armazenamento.removeItem(chave);
    } catch (erro) {
        console.error(`Não foi possível remover "${chave}":`, erro);
    }
}

/** Retorna uma lista salva ou um array vazio. */
function lerLista(chave) {
    const valor = lerStorage(chave, []);
    return Array.isArray(valor) ? valor : [];
}


// ----- Utilitários -----

/** Gera um identificador único. */
function gerarId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    // Alternativa caso randomUUID não esteja disponível
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}


// ----- Usuários e sessão -----

function carregarUsuarios() {
    return lerLista(CHAVES.usuarios);
}

function salvarUsuarios(usuarios) {
    return gravarStorage(CHAVES.usuarios, usuarios);
}

/** Retorna a sessão atual ou null se não existir. */
function lerSessao() {
    const sessao =
        lerStorage(CHAVES.sessao, null, sessionStorage) ||
        lerStorage(CHAVES.sessao, null, localStorage);

    if (!sessao || typeof sessao.usuarioId !== "string") {
        return null;
    }

    return sessao;
}

/**
 * Inicia a sessão do usuário.
 * true: mantém conectado mesmo após fechar o navegador.
 * false: encerra a sessão ao fechar a aba.
 */
function iniciarSessao(usuarioId, manterConectado) {
    encerrarSessao();

    const armazenamento = manterConectado ? localStorage : sessionStorage;
    return gravarStorage(CHAVES.sessao, { usuarioId }, armazenamento);
}

function encerrarSessao() {
    removerStorage(CHAVES.sessao, localStorage);
    removerStorage(CHAVES.sessao, sessionStorage);
}

/** Retorna o usuário logado ou null se não houver sessão válida. */
function obterUsuarioLogado() {
    const sessao = lerSessao();

    if (!sessao) {
        return null;
    }

    const usuario = carregarUsuarios().find(
        (item) => item.id === sessao.usuarioId
    );

    if (!usuario) {
        encerrarSessao();
        return null;
    }

    return usuario;
}


// ----- Coleções -----

function carregarColecoes() {
    return lerLista(CHAVES.colecoes);
}

function salvarColecoes(colecoes) {
    return gravarStorage(CHAVES.colecoes, colecoes);
}

/** Retorna as coleções de um usuário. */
function colecoesDoUsuario(usuarioId) {
    return carregarColecoes().filter(
        (colecao) => colecao.usuarioId === usuarioId
    );
}

// ----- Utilitários de formulário -----

function normalizarEmail(email) {
    return email.trim().toLowerCase();
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Mostra uma mensagem de erro ou sucesso. */
function mostrarMensagem(elemento, texto, tipo = "erro") {
    if (!elemento) {
        return;
    }

    elemento.textContent = texto;
    elemento.className = texto ? `mensagem-formulario mensagem-${tipo}` : "";
}

/** Mostra o erro abaixo do campo. */
function mostrarErroCampo(campo, texto) {
    const idErro = `erro-${campo.id}`;
    let erro = document.getElementById(idErro);

    if (!erro) {
        erro = document.createElement("p");
        erro.id = idErro;
        erro.className = "erro-campo";
        (campo.closest(".campo-formulario") || campo.parentElement).appendChild(erro);
    }

    erro.textContent = texto;
    campo.setAttribute("aria-invalid", "true");
    campo.setAttribute("aria-describedby", idErro);
}

function limparErrosFormulario(formulario) {
    formulario.querySelectorAll(".erro-campo").forEach((erro) => erro.remove());

    formulario.querySelectorAll("[aria-invalid]").forEach((campo) => {
        campo.removeAttribute("aria-invalid");
        campo.removeAttribute("aria-describedby");
    });
}

/** Exibe os erros e foca o primeiro campo inválido. */
function exibirErros(erros, mensagem) {
    if (erros.length === 0) {
        return false;
    }

    erros.forEach(([campo, texto]) => mostrarErroCampo(campo, texto));
    erros[0][0].focus();
    mostrarMensagem(mensagem, "Corrija os campos indicados.", "erro");

    return true;
}


// ----- Senha e contas -----

function bytesParaHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function gerarSal() {
    return bytesParaHex(crypto.getRandomValues(new Uint8Array(16)));
}

/** Gera o hash da senha usando PBKDF2. */
async function gerarHashSenha(senha, sal) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error("Web Crypto indisponível: use https ou localhost.");
    }

    const codificador = new TextEncoder();

    const material = await crypto.subtle.importKey(
        "raw",
        codificador.encode(senha),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: codificador.encode(sal),
            iterations: 100000,
            hash: "SHA-256",
        },
        material,
        256
    );

    return bytesParaHex(new Uint8Array(bits));
}

function buscarUsuarioPorEmail(email) {
    const alvo = normalizarEmail(email);
    return carregarUsuarios().find((usuario) => usuario.email === alvo) || null;
}

/** Cria e salva um novo usuário. */
async function criarUsuario(nome, email, senha) {
    const sal = gerarSal();

    const usuario = {
        id: gerarId(),
        nome: nome.trim(),
        email: normalizarEmail(email),
        senhaHash: await gerarHashSenha(senha, sal),
        sal,
        criadoEm: new Date().toISOString(),
    };

    const usuarios = carregarUsuarios();
    usuarios.push(usuario);

    return salvarUsuarios(usuarios) ? usuario : null;
}

/** Verifica o e-mail e a senha do usuário. */
async function autenticar(email, senha) {
    const usuario = buscarUsuarioPorEmail(email);

    if (!usuario) {
        return null;
    }

    const hash = await gerarHashSenha(senha, usuario.sal);
    return hash === usuario.senhaHash ? usuario : null;
}


// ----- Cabeçalho e proteção de páginas -----

function sairDaConta() {
    encerrarSessao();
    window.location.href = "index.html";
}

/** Atualiza o cabeçalho conforme o estado da sessão. */
function atualizarCabecalho() {
    const usuario = obterUsuarioLogado();

    const contaVisitante = document.getElementById("conta-visitante");
    const contaLogado = document.getElementById("conta-logado");

    if (contaVisitante) {
        contaVisitante.hidden = Boolean(usuario);
    }

    if (contaLogado) {
        contaLogado.hidden = !usuario;
    }

    document.querySelectorAll("[data-requer-login]").forEach((elemento) => {
        elemento.hidden = !usuario;
    });

    if (usuario) {
        const nomeConta = document.getElementById("nome-conta");
        const linkConta = document.getElementById("link-conta");

        if (nomeConta) {
            nomeConta.textContent = usuario.nome;
        }

        if (linkConta) {
            linkConta.setAttribute("aria-label", `Perfil de ${usuario.nome}`);
        }
    }

    const botaoSair = document.getElementById("botao-sair");

    if (botaoSair) {
        botaoSair.addEventListener("click", sairDaConta);
    }
}

/** Controla o acesso às páginas conforme o estado do login. */
function protegerPagina() {
    const usuario = obterUsuarioLogado();

    if (document.body.hasAttribute("data-protegida") && !usuario) {
        window.location.replace("login.html");
        return false;
    }

    if (document.body.hasAttribute("data-somente-visitante") && usuario) {
        window.location.replace("index.html");
        return false;
    }

    return true;
}


// ----- Cadastro e login -----

function iniciarCadastro() {
    const formulario = document.getElementById("formulario-cadastro");
    const mensagem = document.getElementById("mensagem-cadastro");

    const campoNome = document.getElementById("nome-usuario");
    const campoEmail = document.getElementById("email-cadastro");
    const campoSenha = document.getElementById("senha-cadastro");
    const campoConfirmar = document.getElementById("confirmar-senha");
    const campoTermos = document.getElementById("aceitar-termos");

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limparErrosFormulario(formulario);
        mostrarMensagem(mensagem, "");

        const nome = campoNome.value.trim();
        const email = campoEmail.value.trim();
        const senha = campoSenha.value;
        const erros = [];

        if (nome.length < 3 || nome.length > 30) {
            erros.push([campoNome, "O nome de usuário deve ter entre 3 e 30 caracteres."]);
        }

        if (!emailValido(email)) {
            erros.push([campoEmail, "Informe um e-mail válido."]);
        } else if (buscarUsuarioPorEmail(email)) {
            erros.push([campoEmail, "Este e-mail já está cadastrado."]);
        }

        if (senha.length < 8) {
            erros.push([campoSenha, "A senha deve ter pelo menos 8 caracteres."]);
        }

        if (campoConfirmar.value !== senha) {
            erros.push([campoConfirmar, "As senhas não coincidem."]);
        }

        if (!campoTermos.checked) {
            erros.push([campoTermos, "É preciso aceitar os termos para continuar."]);
        }

        if (exibirErros(erros, mensagem)) {
            return;
        }

        const botao = formulario.querySelector('button[type="submit"]');
        botao.disabled = true;

        try {
            const usuario = await criarUsuario(nome, email, senha);

            if (!usuario || !iniciarSessao(usuario.id, true)) {
                throw new Error("Não foi possível gravar a conta ou a sessão.");
            }

            window.location.href = "perfil.html";
        } catch (erro) {
            console.error(erro);
            mostrarMensagem(
                mensagem,
                "Não foi possível criar a conta neste navegador. Tente novamente.",
                "erro"
            );
            botao.disabled = false;
        }
    });
}

function iniciarLogin() {
    const formulario = document.getElementById("formulario-login");
    const mensagem = document.getElementById("mensagem-login");

    const campoEmail = document.getElementById("email-login");
    const campoSenha = document.getElementById("senha-login");
    const campoLembrar = document.getElementById("lembrar-login");

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limparErrosFormulario(formulario);
        mostrarMensagem(mensagem, "");

        const email = campoEmail.value.trim();
        const senha = campoSenha.value;
        const erros = [];

        if (!emailValido(email)) {
            erros.push([campoEmail, "Informe um e-mail válido."]);
        }

        if (senha === "") {
            erros.push([campoSenha, "Informe a senha."]);
        }

        if (exibirErros(erros, mensagem)) {
            return;
        }

        const botao = formulario.querySelector('button[type="submit"]');
        botao.disabled = true;

        try {
            const usuario = await autenticar(email, senha);

            if (!usuario) {
                mostrarMensagem(mensagem, "E-mail ou senha incorretos.", "erro");
                botao.disabled = false;
                return;
            }

            if (!iniciarSessao(usuario.id, campoLembrar.checked)) {
                throw new Error("Não foi possível gravar a sessão.");
            }

            window.location.href = "index.html";
        } catch (erro) {
            console.error(erro);
            mostrarMensagem(
                mensagem,
                "Não foi possível entrar neste navegador. Tente novamente.",
                "erro"
            );
            botao.disabled = false;
        }
    });
}

// ----- Coleções: listagem -----

const ROTULOS_TIPO = {
    musicas: { singular: "música", plural: "músicas" },
    albuns: { singular: "álbum", plural: "álbuns" },
};

function textoQuantidadeItens(tipo, quantidade) {
    const rotulo = ROTULOS_TIPO[tipo] || ROTULOS_TIPO.musicas;
    return `${quantidade} ${quantidade === 1 ? rotulo.singular : rotulo.plural}`;
}

function textoQuantidadeColecoes(quantidade) {
    return `${quantidade} ${quantidade === 1 ? "coleção" : "coleções"}`;
}

// Cria um elemento com classe e texto.
function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}

function criarBotaoAcao(classe, texto) {
    const botao = criarElemento("button", classe, texto);
    botao.type = "button";
    return botao;
}

// Cria o card de uma coleção.
function criarCardColecao(colecao) {
    const itens = Array.isArray(colecao.itens) ? colecao.itens : [];

    const card = criarElemento("article", "card-colecao");
    card.dataset.id = colecao.id;
    card.dataset.tipo = colecao.tipo;
    card.dataset.quantidade = itens.length;

    const capas = criarElemento("div", "capas-colecao");

    const informacoes = criarElemento("div", "informacoes-colecao");
    informacoes.append(criarElemento("h3", "", colecao.nome));

    if (colecao.descricao) {
        informacoes.append(criarElemento("p", "", colecao.descricao));
    }

    informacoes.append(
        criarElemento(
            "span",
            "quantidade-itens",
            textoQuantidadeItens(colecao.tipo, itens.length)
        )
    );

    const acoes = criarElemento("div", "acoes-colecao");
    acoes.append(
        criarBotaoAcao("botao-visualizar-colecao", "Ver coleção"),
        criarBotaoAcao("botao-editar", "Editar"),
        criarBotaoAcao("botao-fixar", "Fixar no perfil"),
        criarBotaoAcao("botao-excluir", "Excluir")
    );

    card.append(capas, informacoes, acoes);
    return card;
}

// ----- Coleções: pesquisa, filtro e ordenação -----

// Remove acentos e maiúsculas para comparar textos.
function normalizarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function compararPorNome(a, b) {
    return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
}

function quantidadeDeItens(colecao) {
    return Array.isArray(colecao.itens) ? colecao.itens.length : 0;
}

const ORDENACOES_COLECOES = {
    recentes: (a, b) => b.criadaEm.localeCompare(a.criadaEm),
    nome: compararPorNome,
    quantidade: (a, b) =>
        quantidadeDeItens(b) - quantidadeDeItens(a) || compararPorNome(a, b),
};

// Lê os valores atuais da pesquisa, do filtro e da ordenação.
function lerControlesColecoes() {
    return {
        pesquisa: normalizarTexto(document.getElementById("pesquisar-colecoes").value),
        tipo: document.getElementById("filtro-tipo").value,
        ordem: document.getElementById("ordenar-colecoes").value,
    };
}

// Aplica pesquisa e filtro e ordena. Devolve uma nova lista (a original não muda).
function aplicarControlesColecoes(colecoes, controles) {
    const comparar =
        ORDENACOES_COLECOES[controles.ordem] || ORDENACOES_COLECOES.recentes;

    return colecoes
        .filter((colecao) => controles.tipo === "todos" || colecao.tipo === controles.tipo)
        .filter((colecao) => normalizarTexto(colecao.nome).includes(controles.pesquisa))
        .sort(comparar);
}

// Volta a pesquisa e o filtro ao padrão (a ordenação escolhida é mantida).
function limparFiltrosColecoes() {
    document.getElementById("pesquisar-colecoes").value = "";
    document.getElementById("filtro-tipo").value = "todos";
}

// Atualiza a lista de coleções conforme os dados salvos e os controles.
function renderizarColecoes() {
    const usuario = obterUsuarioLogado();
    const grade = document.getElementById("grade-colecoes");
    const contador = document.getElementById("quantidade-colecoes");
    const vazio = document.getElementById("colecoes-vazia");
    const semResultado = document.getElementById("colecoes-sem-resultado");

    const todas = usuario ? colecoesDoUsuario(usuario.id) : [];
    const visiveis = aplicarControlesColecoes(todas, lerControlesColecoes());

    grade.replaceChildren(...visiveis.map(criarCardColecao));

    contador.textContent =
        visiveis.length === todas.length
            ? textoQuantidadeColecoes(todas.length)
            : `${visiveis.length} de ${textoQuantidadeColecoes(todas.length)}`;

    vazio.hidden = todas.length > 0;
    semResultado.hidden = todas.length === 0 || visiveis.length > 0;
}


// ----- Coleções: criar, editar e excluir -----

// Guardam qual coleção está sendo editada ou aguardando confirmação de exclusão.
let idColecaoEmEdicao = null;
let idColecaoParaExcluir = null;

// Verifica se o usuário já tem uma coleção com esse nome (sem diferenciar maiúsculas).
function nomeColecaoJaExiste(colecoes, usuarioId, nome, ignorarId) {
    const alvo = nome.toLocaleLowerCase("pt-BR");

    return colecoes.some(
        (colecao) =>
            colecao.usuarioId === usuarioId &&
            colecao.id !== ignorarId &&
            colecao.nome.toLocaleLowerCase("pt-BR") === alvo
    );
}

// Busca a coleção do card clicado, garantindo que pertence ao usuário logado.
function obterColecaoDoCard(elemento) {
    const card = elemento.closest(".card-colecao");
    const usuario = obterUsuarioLogado();

    if (!card || !usuario) {
        return null;
    }

    return (
        carregarColecoes().find(
            (colecao) =>
                colecao.id === card.dataset.id && colecao.usuarioId === usuario.id
        ) || null
    );
}

// Abre o formulário vazio (criar) ou preenchido com a coleção (editar).
function abrirFormularioColecao(colecao = null) {
    const secao = document.getElementById("formulario-colecao");
    const formulario = document.getElementById("formulario-criar-colecao");
    const campoNome = document.getElementById("nome-colecao");
    const campoDescricao = document.getElementById("descricao-colecao");
    const campoTipo = document.getElementById("tipo-colecao");

    limparErrosFormulario(formulario);
    formulario.reset();
    idColecaoEmEdicao = colecao ? colecao.id : null;

    if (colecao) {
        campoNome.value = colecao.nome;
        campoDescricao.value = colecao.descricao;
        campoTipo.value = colecao.tipo;
        campoTipo.title = "O tipo não pode ser alterado depois de criada a coleção.";
    } else {
        campoTipo.removeAttribute("title");
    }

    // O tipo fica bloqueado na edição para não misturar músicas e álbuns.
    campoTipo.disabled = Boolean(colecao);

    document.getElementById("titulo-formulario-colecao").textContent =
        colecao ? "Editar coleção" : "Criar coleção";
    formulario.querySelector('button[type="submit"]').textContent =
        colecao ? "Salvar alterações" : "Criar coleção";

    secao.hidden = false;
    document.getElementById("botao-nova-colecao").setAttribute("aria-expanded", "true");
    secao.scrollIntoView({ behavior: "smooth", block: "start" });
    campoNome.focus({ preventScroll: true });
}

function fecharFormularioColecao() {
    const formulario = document.getElementById("formulario-criar-colecao");

    limparErrosFormulario(formulario);
    formulario.reset();
    idColecaoEmEdicao = null;

    document.getElementById("tipo-colecao").disabled = false;
    document.getElementById("formulario-colecao").hidden = true;
    document.getElementById("botao-nova-colecao").setAttribute("aria-expanded", "false");
}

// O botão "+ Nova coleção" abre o formulário de criação ou fecha, se já estiver aberto.
function alternarFormularioColecao() {
    const aberto = !document.getElementById("formulario-colecao").hidden;

    if (aberto && idColecaoEmEdicao === null) {
        fecharFormularioColecao();
    } else {
        abrirFormularioColecao();
    }
}

// Valida e salva (cria ou atualiza) a coleção do formulário.
function salvarFormularioColecao(evento) {
    evento.preventDefault();

    const formulario = evento.target;
    const mensagem = document.getElementById("mensagem-colecoes");
    const usuario = obterUsuarioLogado();

    limparErrosFormulario(formulario);
    mostrarMensagem(mensagem, "");

    if (!usuario) {
        window.location.replace("login.html");
        return;
    }

    const campoNome = document.getElementById("nome-colecao");
    const campoTipo = document.getElementById("tipo-colecao");
    const nome = campoNome.value.trim().replace(/\s+/g, " ");
    const descricao = document.getElementById("descricao-colecao").value.trim();
    const tipo = campoTipo.value;

    const colecoes = carregarColecoes();
    const erros = [];

    if (nome === "") {
        erros.push([campoNome, "Informe o nome da coleção."]);
    } else if (nomeColecaoJaExiste(colecoes, usuario.id, nome, idColecaoEmEdicao)) {
        erros.push([campoNome, "Você já tem uma coleção com esse nome."]);
    }

    if (!TIPOS_COLECAO.includes(tipo)) {
        erros.push([campoTipo, "Escolha um tipo válido."]);
    }

    if (exibirErros(erros, mensagem)) {
        return;
    }

    let textoSucesso;

    if (idColecaoEmEdicao) {
        const colecao = colecoes.find(
            (item) => item.id === idColecaoEmEdicao && item.usuarioId === usuario.id
        );

        if (!colecao) {
            mostrarMensagem(mensagem, "Coleção não encontrada.", "erro");
            fecharFormularioColecao();
            renderizarColecoes();
            return;
        }

        colecao.nome = nome;
        colecao.descricao = descricao;
        textoSucesso = "Coleção atualizada.";
    } else {
        colecoes.push({
            id: gerarId(),
            usuarioId: usuario.id,
            nome,
            descricao,
            tipo,
            criadaEm: new Date().toISOString(),
            itens: [],
        });
        limparFiltrosColecoes(); // garante que a nova coleção apareça na lista
        textoSucesso = "Coleção criada.";
    }

    if (!salvarColecoes(colecoes)) {
        mostrarMensagem(
            mensagem,
            "Não foi possível salvar. Verifique o armazenamento do navegador.",
            "erro"
        );
        return;
    }

    fecharFormularioColecao();
    renderizarColecoes();
    mostrarMensagem(mensagem, textoSucesso, "sucesso");
}

// Abre a confirmação de exclusão.
function abrirDialogoExclusao(colecao) {
    idColecaoParaExcluir = colecao.id;

    document.getElementById("texto-dialogo-excluir").textContent =
        `A coleção "${colecao.nome}" será excluída. Essa ação não pode ser desfeita.`;
    document.getElementById("dialogo-excluir").showModal();
}

// Exclui a coleção confirmada e atualiza o armazenamento e a tela.
function confirmarExclusao() {
    const id = idColecaoParaExcluir;
    const usuario = obterUsuarioLogado();
    const mensagem = document.getElementById("mensagem-colecoes");
    const dialogo = document.getElementById("dialogo-excluir");

    const colecoes = carregarColecoes();
    const restantes = colecoes.filter(
        (colecao) => !(colecao.id === id && usuario && colecao.usuarioId === usuario.id)
    );

    dialogo.close();

    if (restantes.length === colecoes.length) {
        mostrarMensagem(mensagem, "Coleção não encontrada.", "erro");
        renderizarColecoes();
        return;
    }

    if (!salvarColecoes(restantes)) {
        mostrarMensagem(
            mensagem,
            "Não foi possível excluir. Verifique o armazenamento do navegador.",
            "erro"
        );
        return;
    }

    if (idColecaoEmEdicao === id) {
        fecharFormularioColecao();
    }

    renderizarColecoes();
    mostrarMensagem(mensagem, "Coleção excluída.", "sucesso");
}

// Trata os botões dos cards (os cards são criados dinamicamente: delegação de eventos).
function tratarCliqueGrade(evento) {
    const botao = evento.target.closest("button");

    if (!botao) {
        return;
    }

    const ehEditar = botao.classList.contains("botao-editar");
    const ehExcluir = botao.classList.contains("botao-excluir");

    if (!ehEditar && !ehExcluir) {
        return;
    }

    const colecao = obterColecaoDoCard(botao);

    if (!colecao) {
        return;
    }

    if (ehEditar) {
        abrirFormularioColecao(colecao);
    } else {
        abrirDialogoExclusao(colecao);
    }
}

function iniciarColecoes() {
    renderizarColecoes();

    // Pesquisa, filtro e ordenação
    document
        .getElementById("pesquisar-colecoes")
        .addEventListener("input", renderizarColecoes);
    document
        .getElementById("filtro-tipo")
        .addEventListener("change", renderizarColecoes);
    document
        .getElementById("ordenar-colecoes")
        .addEventListener("change", renderizarColecoes);

    // Enter no campo de pesquisa não deve recarregar a página.
    document
        .getElementById("formulario-pesquisa-colecoes")
        .addEventListener("submit", (evento) => evento.preventDefault());

    document
        .getElementById("botao-limpar-filtros")
        .addEventListener("click", () => {
            limparFiltrosColecoes();
            renderizarColecoes();
        });

    document
        .getElementById("botao-nova-colecao")
        .addEventListener("click", alternarFormularioColecao);
    document
        .getElementById("botao-cancelar-colecao")
        .addEventListener("click", fecharFormularioColecao);
    document
        .getElementById("formulario-criar-colecao")
        .addEventListener("submit", salvarFormularioColecao);
    document
        .getElementById("grade-colecoes")
        .addEventListener("click", tratarCliqueGrade);

    const dialogo = document.getElementById("dialogo-excluir");

    document
        .getElementById("botao-cancelar-exclusao")
        .addEventListener("click", () => dialogo.close());
    document
        .getElementById("botao-confirmar-exclusao")
        .addEventListener("click", confirmarExclusao);

    // Fechar o diálogo (Cancelar ou Esc) descarta a exclusão pendente.
    dialogo.addEventListener("close", () => {
        idColecaoParaExcluir = null;
    });
}

// ----- Inicialização -----

// O defer garante que o HTML esteja carregado antes da execução.
function iniciar() {
    if (!protegerPagina()) {
        return;
    }

    atualizarCabecalho();

    if (document.getElementById("formulario-cadastro")) {
        iniciarCadastro();
    }

    if (document.getElementById("formulario-login")) {
        iniciarLogin();
    }

    if (document.getElementById("grade-colecoes")) {
        iniciarColecoes();
    }
}

iniciar();