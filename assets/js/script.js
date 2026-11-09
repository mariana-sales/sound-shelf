/* SOUND SHELF - script.js
   Organização:
   - Constantes
   - Armazenamento
   - Utilitários
   - Usuários e sessão
   - Coleções

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