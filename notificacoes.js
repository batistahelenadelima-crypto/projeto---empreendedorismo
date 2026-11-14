
document.addEventListener("DOMContentLoaded", async function () {

    const db = window.supabaseClient;

    const lista = document.getElementById("lista-notificacoes");
    const mensagemVazia = document.getElementById("sem-notificacoes");
    const botaoMarcarTodas = document.getElementById("marcar-todas");
    const resumo = document.getElementById("resumo-notificacoes");

    if (!db) {
        resumo.textContent = "Não foi possível conectar ao sistema.";
        return;
    }

    // VERIFICAR LOGIN

    const { data: sessaoData, error: erroSessao } =
        await db.auth.getSession();

    if (erroSessao || !sessaoData.session) {
        window.location.href = "login.html";
        return;
    }

    const usuario = sessaoData.session.user;

    let notificacoes = [];

    // BUSCAR NOTIFICAÇÕES

    async function carregarNotificacoes() {

        resumo.textContent = "Carregando suas notificações...";
        lista.innerHTML = "";

        const { data, error } = await db
            .from("notifications")
            .select("id, user_id, titulo, mensagem, read_at, criado_em")
            .eq("user_id", usuario.id)
            .order("criado_em", { ascending: false });

        if (error) {
            console.error("Erro ao buscar notificações:", error);

            resumo.textContent = "Não foi possível carregar os avisos.";
            botaoMarcarTodas.disabled = true;
            return;
        }

        notificacoes = data || [];

        mostrarNotificacoes();
    }

    // ESCOLHER ÍCONE

    function escolherIcone(titulo) {

        const texto = String(titulo || "").toLowerCase();

        if (texto.includes("esporte") || texto.includes("treino")) {
            return "🏐";
        }

        if (texto.includes("estudo") || texto.includes("matéria")) {
            return "📚";
        }

        if (texto.includes("ponto") || texto.includes("conquista")) {
            return "✨";
        }

        return "🔔";
    }

    // FORMATAR DATA

    function formatarData(data) {

        if (!data) return "";

        return new Date(data).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // MOSTRAR NOTIFICAÇÕES

    function mostrarNotificacoes() {

        lista.innerHTML = "";

        mensagemVazia.style.display =
            notificacoes.length === 0 ? "block" : "none";

        const naoLidas = notificacoes.filter(
            notificacao => !notificacao.read_at
        ).length;

        resumo.textContent =
            `${notificacoes.length} aviso(s) · ${naoLidas} não lido(s)`;

        botaoMarcarTodas.disabled = naoLidas === 0;

        botaoMarcarTodas.textContent =
            naoLidas === 0
                ? "Todas as notificações foram lidas"
                : "Marcar todas como lidas";

        notificacoes.forEach(function (notificacao) {

            const cartao = document.createElement("article");

            cartao.className = "notificacao";

            if (!notificacao.read_at) {
                cartao.classList.add("nao-lida");
            }

            const icone = document.createElement("div");
            icone.className = "icone-notificacao";
            icone.textContent = escolherIcone(notificacao.titulo);

            const texto = document.createElement("div");
            texto.className = "texto-notificacao";

            const categoria = document.createElement("span");
            categoria.className = "categoria-notificacao";
            categoria.textContent = "CONECTA+";

            const titulo = document.createElement("h3");
            titulo.textContent = notificacao.titulo;

            const mensagem = document.createElement("p");
            mensagem.textContent = notificacao.mensagem;

            const data = document.createElement("small");
            data.textContent = formatarData(notificacao.criado_em);

            texto.appendChild(categoria);
            texto.appendChild(titulo);
            texto.appendChild(mensagem);
            texto.appendChild(data);

            cartao.appendChild(icone);
            cartao.appendChild(texto);

            if (!notificacao.read_at) {

                const ponto = document.createElement("span");
                ponto.className = "ponto-notificacao";

                cartao.appendChild(ponto);

                const botaoLer = document.createElement("button");
                botaoLer.type = "button";
                botaoLer.textContent = "Marcar como lida";
                botaoLer.className = "botao-ler-notificacao";

                botaoLer.addEventListener("click", function () {
                    marcarComoLida(notificacao.id);
                });

                texto.appendChild(botaoLer);
            }

            lista.appendChild(cartao);

        });
    }

    // MARCAR UMA NOTIFICAÇÃO COMO LIDA

    async function marcarComoLida(id) {

        const { error } = await db
            .from("notifications")
            .update({
                read_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("user_id", usuario.id)
            .is("read_at", null);

        if (error) {
            console.error("Erro ao marcar como lida:", error);
            alert("Não foi possível atualizar a notificação.");
            return;
        }

        await carregarNotificacoes();
    }

    // MARCAR TODAS COMO LIDAS

    botaoMarcarTodas.addEventListener("click", async function () {

        const { error } = await db
            .from("notifications")
            .update({
                read_at: new Date().toISOString()
            })
            .eq("user_id", usuario.id)
            .is("read_at", null);

        if (error) {
            console.error("Erro ao atualizar notificações:", error);
            alert("Não foi possível marcar todas como lidas.");
            return;
        }

        await carregarNotificacoes();
    });

    // SAIR DA PLATAFORMA

    const botaoSair = document.querySelector(".voltar-notificacoes");

    // CARREGAR DADOS

    await carregarNotificacoes();

});
