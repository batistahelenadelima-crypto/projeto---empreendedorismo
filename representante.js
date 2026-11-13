
document.addEventListener("DOMContentLoaded", async function () {

    const db = window.supabaseClient;

    const acesso = document.getElementById("acesso-representante");
    const painel = document.getElementById("painel-representante");
    const aviso = document.querySelector(".aviso-demonstracao");

    const listaAlunos = document.getElementById("lista-alunos");
    const listaInscricoes = document.getElementById("lista-inscricoes");

    const pesquisarAluno = document.getElementById("pesquisar-aluno");
    const filtroParticipacao = document.getElementById("filtro-participacao");
    const botaoSair = document.getElementById("sair-demonstracao");

    let alunos = [];

    // VERIFICAR CONEXÃO
    if (!db) {
        aviso.textContent = "Erro: não foi possível conectar ao sistema.";
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
                <a href="login.html">Voltar ao login</a>
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

        // CARREGAR INSCRIÇÕES E ALUNOS
        await carregarInscricoes();
        await carregarAlunos();

    } catch (erro) {

        console.error("Erro no painel:", erro);

        painel.style.display = "none";
        acesso.style.display = "block";

        aviso.innerHTML = `
            <strong>Não foi possível carregar o painel</strong>
            <p>Verifique a conexão e tente novamente.</p>
        `;

    }

    // CRIAR ELEMENTOS DE TEXTO
    function criarTexto(tag, classe, conteudo) {

        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        elemento.textContent =
            conteudo === null || conteudo === undefined ? "" : String(conteudo);

        return elemento;

    }

    // BUSCAR PERFIS PELOS IDS
    async function buscarPerfis(ids) {

        if (!ids.length) return [];

        const { data, error } = await db
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
            .in("id", ids);

        if (error) throw error;

        return data || [];

    }

    // CARREGAR INSCRIÇÕES PENDENTES
    async function carregarInscricoes() {

        listaInscricoes.innerHTML =
            "<p>Carregando inscrições...</p>";

        const { data: inscricoes, error } = await db
            .from("enrollments")
            .select("id, student_id, status, created_at")
            .eq("status", "pending")
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (!inscricoes || inscricoes.length === 0) {

            listaInscricoes.innerHTML = `
                <div class="nenhum-aluno">
                    <h3>Nenhuma inscrição pendente</h3>
                    <p>Novos pedidos de participação aparecerão aqui.</p>
                </div>
            `;

            return;

        }

        const ids = inscricoes.map(function (inscricao) {
            return inscricao.student_id;
        });

        const perfis = await buscarPerfis(ids);

        listaInscricoes.innerHTML = "";

        inscricoes.forEach(function (inscricao) {

            const aluno = perfis.find(function (perfil) {
                return perfil.id === inscricao.student_id;
            });

            if (!aluno) return;

            const cartao = document.createElement("article");
            cartao.className = "cartao-aluno-representante";

            const informacoes = document.createElement("div");
            informacoes.className = "informacoes-aluno";

            const dados = document.createElement("div");

            dados.appendChild(
                criarTexto("h3", "", aluno.full_name || "Nome não informado")
            );

            dados.appendChild(
                criarTexto(
                    "p",
                    "",
                    `${aluno.age || "Idade não informada"} anos · ${aluno.school_year || "Ano não informado"} · ${aluno.class_group || "Turma não informada"}`
                )
            );

            dados.appendChild(
                criarTexto(
                    "p",
                    "",
                    `Participação: ${aluno.participation || "Não informada"}`
                )
            );

            if (aluno.sport_preference) {

                dados.appendChild(
                    criarTexto("p", "", `Esporte: ${aluno.sport_preference}`)
                );

            }

            if (aluno.subject_preferences) {

                const materias = Array.isArray(aluno.subject_preferences)
                    ? aluno.subject_preferences.join(", ")
                    : String(aluno.subject_preferences);

                dados.appendChild(
                    criarTexto("p", "", `Matérias: ${materias}`)
                );

            }

            informacoes.appendChild(dados);
            cartao.appendChild(informacoes);

            // BOTÕES DE APROVAÇÃO
            const botoes = document.createElement("div");
            botoes.className = "botoes-aprovacao";

            const aprovar = document.createElement("button");
            aprovar.type = "button";
            aprovar.textContent = "Aprovar";
            aprovar.className = "botao-aprovar";

            const rejeitar = document.createElement("button");
            rejeitar.type = "button";
            rejeitar.textContent = "Rejeitar";
            rejeitar.className = "botao-rejeitar";

            aprovar.addEventListener("click", function () {
                avaliarInscricao(
                    inscricao.id,
                    "approved",
                    aprovar,
                    rejeitar
                );
            });

            rejeitar.addEventListener("click", function () {
                avaliarInscricao(
                    inscricao.id,
                    "rejected",
                    aprovar,
                    rejeitar
                );
            });

            botoes.appendChild(aprovar);
            botoes.appendChild(rejeitar);

            cartao.appendChild(botoes);
            listaInscricoes.appendChild(cartao);

        });

    }

    // APROVAR OU REJEITAR INSCRIÇÃO
    async function avaliarInscricao(
        id,
        status,
        botaoAprovar,
        botaoRejeitar
    ) {

        const confirmacao = status === "approved"
            ? "Deseja aprovar esta inscrição?"
            : "Deseja rejeitar esta inscrição?";

        if (!window.confirm(confirmacao)) return;

        botaoAprovar.disabled = true;
        botaoRejeitar.disabled = true;

        const { data, error } = await db.rpc("review_enrollment", {
            p_enrollment_id: id,
            p_status: status
        });

        if (error || data !== true) {

            console.error("Erro ao avaliar inscrição:", error);

            alert(
                "Não foi possível atualizar a inscrição. Tente novamente."
            );

            botaoAprovar.disabled = false;
            botaoRejeitar.disabled = false;

            return;

        }

        alert(
            status === "approved"
                ? "Inscrição aprovada com sucesso!"
                : "Inscrição rejeitada com sucesso!"
        );

        await carregarInscricoes();
        await carregarAlunos();

    }

    // CARREGAR ALUNOS APROVADOS E PONTUAÇÃO
    async function carregarAlunos() {

        listaAlunos.innerHTML = "<p>Carregando alunos...</p>";

        const { data: inscricoes, error } = await db
            .from("enrollments")
            .select("student_id, status")
            .eq("status", "approved");

        if (error) throw error;

        if (!inscricoes || inscricoes.length === 0) {

            alunos = [];

            atualizarResumo();

            listaAlunos.innerHTML = `
                <div class="nenhum-aluno">
                    <h3>Nenhum aluno aprovado ainda</h3>
                    <p>Os alunos aprovados aparecerão nesta lista.</p>
                </div>
            `;

            return;

        }

        const ids = inscricoes.map(function (inscricao) {
            return inscricao.student_id;
        });

        const perfis = await buscarPerfis(ids);

        // ORGANIZAR DADOS DOS ALUNOS
        alunos = perfis.map(function (aluno) {

            return {
                id: aluno.id,
                nome: aluno.full_name,
                ano: aluno.school_year,
                turma: aluno.class_group,
                participacao: aluno.participation,
                pontos: 0
            };

        });

        // BUSCAR PONTUAÇÃO DOS ALUNOS
        const idsAlunos = alunos.map(function (aluno) {
            return aluno.id;
        });

        if (idsAlunos.length > 0) {

            const { data: pontuacoes, error: erroPontos } = await db
                .from("points_ledger")
                .select("student_id, points")
                .in("student_id", idsAlunos);

            if (erroPontos) throw erroPontos;

            alunos.forEach(function (aluno) {

                aluno.pontos = (pontuacoes || [])
                    .filter(function (registro) {
                        return registro.student_id === aluno.id;
                    })
                    .reduce(function (total, registro) {
                        return total + Number(registro.points || 0);
                    }, 0);

            });

        }

        atualizarResumo();
        mostrarAlunos();

    }

    // ATUALIZAR RESUMO
    function atualizarResumo() {

        document.getElementById("total-alunos").textContent =
            alunos.length;

        const totalPontos = alunos.reduce(function (total, aluno) {
            return total + aluno.pontos;
        }, 0);

        document.getElementById("total-pontos").textContent =
            totalPontos;

        // Será conectado à contagem de registros em uma próxima etapa.
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

        if (texto.includes("esporte") || texto.includes("sport")) {
            return "esportes";
        }

        if (texto.includes("estudo") || texto.includes("study")) {
            return "estudos";
        }

        return texto;

    }

    // MOSTRAR ALUNOS APROVADOS
    function mostrarAlunos() {

        const pesquisa = pesquisarAluno.value.toLowerCase().trim();
        const filtro = filtroParticipacao.value;

        listaAlunos.innerHTML = "";

        const filtrados = alunos.filter(function (aluno) {

            const nomeCorresponde =
                (aluno.nome || "").toLowerCase().includes(pesquisa);

            const participacao =
                normalizarParticipacao(aluno.participacao);

            const filtroCorresponde =
                filtro === "todos" || participacao === filtro;

            return nomeCorresponde && filtroCorresponde;

        });

        if (filtrados.length === 0) {

            listaAlunos.innerHTML = `
                <div class="nenhum-aluno">
                    <h3>Nenhum aluno encontrado</h3>
                    <p>Tente alterar a pesquisa ou o filtro.</p>
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
            avatar.textContent =
                (aluno.nome || "?").charAt(0).toUpperCase();

            const dados = document.createElement("div");

            dados.appendChild(
                criarTexto("h3", "", aluno.nome || "Nome não informado")
            );

            dados.appendChild(
                criarTexto(
                    "p",
                    "",
                    `${aluno.ano || "Ano não informado"} · ${aluno.turma || "Turma não informada"}`
                )
            );

            // MOSTRAR PONTOS DO ALUNO
            const pontos = document.createElement("div");
            pontos.className = "pontos-aluno";

            pontos.appendChild(
                criarTexto("strong", "", aluno.pontos)
            );

            pontos.appendChild(
                criarTexto("span", "", "pontos")
            );

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
