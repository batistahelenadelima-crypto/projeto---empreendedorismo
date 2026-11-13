
document.addEventListener("DOMContentLoaded", async function () {

    const db = window.supabaseClient;

    const acesso = document.getElementById("acesso-representante");
    const painel = document.getElementById("painel-representante");
    const aviso = document.querySelector(".aviso-demonstracao");

    const listaAlunos = document.getElementById("lista-alunos");
    const pesquisarAluno = document.getElementById("pesquisar-aluno");
    const filtroParticipacao = document.getElementById("filtro-participacao");

    let alunos = [];

    // VERIFICAR CONEXÃO
    if (!db) {
        aviso.innerHTML = `
            <strong>Erro de conexão</strong>
            <p>Não foi possível conectar ao sistema.</p>
        `;
        return;
    }

    try {

        // VERIFICAR LOGIN
        const { data: sessao, error: erroSessao } =
            await db.auth.getSession();

        if (erroSessao) throw erroSessao;

        if (!sessao.session) {
            aviso.innerHTML = `
                <strong>Login necessário</strong>
                <p>Entre na sua conta para acessar esta área.</p>
                <a href="login.html">Ir para o login</a>
            `;
            return;
        }

        // VERIFICAR CARGO
        const { data: autorizado, error: erroPermissao } =
            await db.rpc("is_staff");

        if (erroPermissao) throw erroPermissao;

        if (!autorizado) {
            aviso.innerHTML = `
                <strong>Acesso não autorizado</strong>
                <p>Esta área é exclusiva para representantes.</p>
            `;
            return;
        }

        // LIBERAR PAINEL
        acesso.style.display = "none";
        painel.style.display = "block";

        const nome =
            sessao.session.user.user_metadata?.full_name || "representante";

        painel.querySelector(".boas-vindas-representante h1").textContent =
            `Olá, ${nome}!`;

        // CARREGAR ALUNOS APROVADOS
        await carregarAlunos();

    } catch (erro) {

        console.error("Erro no painel:", erro);

        aviso.innerHTML = `
            <strong>Não foi possível carregar o painel</strong>
            <p>Verifique a conexão e tente novamente.</p>
        `;

    }

    // BUSCAR ALUNOS APROVADOS
    async function carregarAlunos() {

        listaAlunos.innerHTML = `
            <p>Carregando alunos...</p>
        `;

        const { data: inscricoes, error: erroInscricoes } =
            await db
                .from("enrollments")
                .select("student_id, status")
                .in("status", ["approved", "aprovado", "aprovada"]);

        if (erroInscricoes) throw erroInscricoes;

        if (!inscricoes || inscricoes.length === 0) {

            alunos = [];

            atualizarResumo();

            listaAlunos.innerHTML = `
                <div class="nenhum-aluno">
                    <h3>Nenhum aluno aprovado ainda</h3>
                    <p>
                        Quando uma inscrição for aprovada,
                        o aluno aparecerá nesta lista.
                    </p>
                </div>
            `;

            return;
        }

        const idsAlunos = inscricoes.map(function (inscricao) {
            return inscricao.student_id;
        });

        const { data: perfis, error: erroPerfis } =
            await db
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    age,
                    school_year,
                    class_group,
                    participation,
                    sport_preference,
                    subject_preferences
                `)
                .in("id", idsAlunos);

        if (erroPerfis) throw erroPerfis;

        alunos = (perfis || []).map(function (aluno) {

            return {
                id: aluno.id,
                nome: aluno.full_name,
                idade: aluno.age,
                ano: aluno.school_year,
                turma: aluno.class_group,
                participacao: aluno.participation,
                esporte: aluno.sport_preference,
                materias: aluno.subject_preferences,
                pontos: 0
            };

        });

        atualizarResumo();
        mostrarAlunos();

    }

    // ATUALIZAR RESUMO
    function atualizarResumo() {

        document.getElementById("total-alunos").textContent =
            alunos.length;

        // A pontuação será conectada em uma próxima etapa.
        document.getElementById("total-pontos").textContent = "—";

        // Os registros também serão conectados posteriormente.
        document.getElementById("total-registros").textContent = "—";

    }

    // NORMALIZAR PARTICIPAÇÃO
    function normalizarParticipacao(valor) {

        const texto = String(valor || "").toLowerCase();

        if (
            texto.includes("ambos") ||
            texto.includes("both") ||
            texto.includes("ambas")
        ) {
            return "ambos";
        }

        if (
            texto.includes("esporte") ||
            texto.includes("sport")
        ) {
            return "esportes";
        }

        if (
            texto.includes("estudo") ||
            texto.includes("study")
        ) {
            return "estudos";
        }

        return texto;

    }

    // EXIBIR ALUNOS
    function mostrarAlunos() {

        const pesquisa = pesquisarAluno.value.toLowerCase().trim();
        const filtro = filtroParticipacao.value;

        listaAlunos.innerHTML = "";

        const filtrados = alunos.filter(function (aluno) {

            const nomeCorresponde =
                (aluno.nome || "").toLowerCase().includes(pesquisa);

            const participacao = normalizarParticipacao(
                aluno.participacao
            );

            const filtroCorresponde =
                filtro === "todos" || participacao === filtro;

            return nomeCorresponde && filtroCorresponde;

        });

        if (filtrados.length === 0) {

            listaAlunos.innerHTML = `
                <div class="nenhum-aluno">
                    <h3>Nenhum aluno encontrado</h3>
                    <p>
                        Tente pesquisar por outro nome
                        ou alterar o filtro.
                    </p>
                </div>
            `;

            return;
        }

        filtrados.forEach(function (aluno) {

            const cartao = document.createElement("article");
            cartao.className = "cartao-aluno-representante";

            const informacoes = document.createElement("div");
            informacoes.className = "informacoes-aluno";

            const avatar = document.createElement("div");
            avatar.className = "avatar-aluno";
            avatar.textContent = (aluno.nome || "?").charAt(0).toUpperCase();

            const dados = document.createElement("div");

            const nome = document.createElement("h3");
            nome.textContent = aluno.nome || "Nome não informado";

            const turma = document.createElement("p");
            turma.textContent =
                `${aluno.ano || "Ano não informado"} · ${aluno.turma || "Turma não informada"}`;

            dados.appendChild(nome);
            dados.appendChild(turma);

            const pontos = document.createElement("div");
            pontos.className = "pontos-aluno";

            const totalPontos = document.createElement("strong");
            totalPontos.textContent = "—";

            const textoPontos = document.createElement("span");
            textoPontos.textContent = "pontos";

            pontos.appendChild(totalPontos);
            pontos.appendChild(textoPontos);

            informacoes.appendChild(avatar);
            informacoes.appendChild(dados);
            informacoes.appendChild(pontos);

            cartao.appendChild(informacoes);

            listaAlunos.appendChild(cartao);

        });

    }

    // PESQUISA E FILTROS
    pesquisarAluno.addEventListener("input", mostrarAlunos);

    filtroParticipacao.addEventListener("change", mostrarAlunos);

    // SAIR DA CONTA
    const botaoSair = document.getElementById("sair-demonstracao");

    botaoSair.addEventListener("click", async function () {

        const { error } = await db.auth.signOut();

        if (error) {
            alert("Não foi possível sair da conta.");
            console.error(error);
            return;
        }

        window.location.href = "login.html";

    });

});
