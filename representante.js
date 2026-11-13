
document.addEventListener("DOMContentLoaded", async function () {

    const acesso = document.getElementById("acesso-representante");
    const painel = document.getElementById("painel-representante");
    const aviso = document.querySelector(".aviso-demonstracao");

    const botaoDemonstracao = document.getElementById("entrar-demonstracao");

    // ESCONDER O PAINEL ATÉ VERIFICAR A CONTA
    painel.style.display = "none";

    if (botaoDemonstracao) {
        botaoDemonstracao.style.display = "none";
    }

    // VERIFICAR SE O SUPABASE FOI CARREGADO
    if (!window.supabaseClient) {
        aviso.innerHTML = `
            <strong>Erro de conexão</strong>
            <p>Não foi possível carregar o sistema. Tente novamente mais tarde.</p>
        `;
        return;
    }

    try {

        // VERIFICAR SE EXISTE UMA SESSÃO ATIVA
        const { data: sessao, error: erroSessao } =
            await window.supabaseClient.auth.getSession();

        if (erroSessao) {
            throw erroSessao;
        }

        if (!sessao.session) {

            aviso.innerHTML = `
                <strong>Login necessário</strong>
                <p>Entre na sua conta do Conecta+ para acessar esta área.</p>
                <a href="login.html">Ir para o login</a>
            `;

            return;
        }

        // VERIFICAR SE A CONTA POSSUI CARGO DE REPRESENTANTE OU ADMIN
        const { data: autorizado, error: erroPermissao } =
            await window.supabaseClient.rpc("is_staff");

        if (erroPermissao) {
            throw erroPermissao;
        }

        if (!autorizado) {

            aviso.innerHTML = `
                <strong>Acesso não autorizado</strong>
                <p>Esta área é exclusiva para representantes do Conecta+.</p>
            `;

            return;
        }

        // ACESSO AUTORIZADO
        acesso.style.display = "none";
        painel.style.display = "block";

        // REMOVER OS DADOS FICTÍCIOS DO RESUMO
        document.getElementById("total-alunos").textContent = "0";
        document.getElementById("total-pontos").textContent = "0";
        document.getElementById("total-registros").textContent = "0";

        // IDENTIFICAR A CONTA
        const nome =
            sessao.session.user.user_metadata?.full_name || "representante";

        const titulo = painel.querySelector(".boas-vindas-representante h1");

        if (titulo) {
            titulo.textContent = `Olá, ${nome}!`;
        }

        document.getElementById("lista-alunos").innerHTML = `
            <div class="nenhum-aluno">
                <h3>Acesso autorizado!</h3>
                <p>Estamos preparando a conexão com os dados dos alunos.</p>
            </div>
        `;

    } catch (erro) {

        console.error("Erro na área do representante:", erro);

        aviso.innerHTML = `
            <strong>Não foi possível verificar seu acesso</strong>
            <p>Ocorreu um erro na comunicação com o sistema. Tente novamente.</p>
        `;

    }

});
