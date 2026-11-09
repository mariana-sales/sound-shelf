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
}

iniciar();