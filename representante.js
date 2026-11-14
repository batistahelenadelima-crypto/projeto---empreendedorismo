
document.addEventListener("DOMContentLoaded", async function () {

    const db = window.supabaseClient;

    const acesso = document.getElementById("acesso-representante");
    const painel = document.getElementById("painel-representante");
    const aviso = document.querySelector(".aviso-demonstracao");

    const listaAlunos = document.getElementById("lista-alunos");
    const listaInscricoes = document.getElementById("lista-inscricoes");
    const listaAtividades = document.getElementById("lista-atividades");

    const pesquisarAluno = document.getElementById("pesquisar-aluno");
    const filtroParticipacao = document.getElementById("filtro-participacao");
    const botaoSair = document.getElementById("sair-demonstracao");

    const formularioAtividade = document.getElementById("form-nova-atividade");
    const mensagemAtividade = document.getElementById("mensagem-atividade");
    // ELEMENTOS DE NOTIFICAÇÃO

const formularioNotificacao =
    document.getElementById("form-notificacao");

const seletorNotificacao =
    document.getElementById("notificacao-aluno");

const tituloNotificacao =
    document.getElementById("notificacao-titulo");

const textoNotificacao =
    document.getElementById("notificacao-mensagem");

const mensagemNotificacao =
    document.getElementById("mensagem-notificacao");

const botaoEnviarNotificacao =
    document.getElementById("botao-enviar-notificacao");

    let alunos = [];
    let atividades = [];

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

        // CARREGAR DADOS
        await carregarInscricoes();
        await carregarAlunos();
        await carregarAtividades();

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
            conteudo === null || conteudo === undefined
                ? ""
                : String(conteudo);

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
            .select("id, student_id, status")
            .eq("status", "pending");

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

        try {

            const { data, error } = await db.rpc("review_enrollment", {
                p_enrollment_id: id,
                p_status: status
            });

            if (error) throw error;

            if (data !== true) {
                throw new Error("A inscrição não foi atualizada.");
            }

            alert(
                status === "approved"
                    ? "Inscrição aprovada com sucesso!"
                    : "Inscrição rejeitada com sucesso!"
            );

            await carregarInscricoes();
            await carregarAlunos();

        } catch (erro) {

            console.error("Erro ao avaliar inscrição:", erro);

            alert(
                "Não foi possível atualizar a inscrição. Tente novamente."
            );

            botaoAprovar.disabled = false;
            botaoRejeitar.disabled = false;

        }

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

            await atualizarResumo();

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

        await atualizarResumo();
        mostrarAlunos();

    }

    // ATUALIZAR RESUMO
    async function atualizarResumo() {

        document.getElementById("total-alunos").textContent =
            alunos.length;

        const totalPontos = alunos.reduce(function (total, aluno) {
            return total + aluno.pontos;
        }, 0);

        document.getElementById("total-pontos").textContent =
            totalPontos;

        const idsAlunos = alunos.map(function (aluno) {
            return aluno.id;
        });

        let totalPresencas = 0;
        let totalConclusoes = 0;

        if (idsAlunos.length > 0) {

            // CONTAR PRESENÇAS
            const { count: presencas, error: erroPresencas } = await db
                .from("attendance")
                .select("student_id", {
                    count: "exact",
                    head: true
                })
                .in("student_id", idsAlunos);

            if (erroPresencas) throw erroPresencas;

            totalPresencas = presencas || 0;

            // CONTAR ATIVIDADES CONCLUÍDAS
            const { count: conclusoes, error: erroConclusoes } = await db
                .from("activity_completions")
                .select("student_id", {
                    count: "exact",
                    head: true
                })
                .in("student_id", idsAlunos);

            if (erroConclusoes) throw erroConclusoes;

            totalConclusoes = conclusoes || 0;

        }

        document.getElementById("total-registros").textContent =
            totalPresencas + totalConclusoes;

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

    // CRIAR CONTROLES DE PRESENÇA E CONCLUSÃO
    function criarControlesRegistro(aluno) {

        const area = document.createElement("div");
        area.className = "registro-atividade-aluno";

        const titulo = criarTexto(
            "h4",
            "",
            "Registrar participação"
        );

        area.appendChild(titulo);

        const seletor = document.createElement("select");
        seletor.className = "seletor-atividade-aluno";

        const opcaoInicial = document.createElement("option");
        opcaoInicial.value = "";
        opcaoInicial.textContent = "Selecione uma atividade";
        seletor.appendChild(opcaoInicial);

        const atividadesAtivas = atividades.filter(function (atividade) {
            return atividade.is_active === true;
        });

        atividadesAtivas.forEach(function (atividade) {

            const opcao = document.createElement("option");

            opcao.value = atividade.id;

            const categoria =
                atividade.category === "esporte" ? "Esporte" : "Estudo";

            opcao.textContent =
                `${atividade.title} — ${categoria}`;

            seletor.appendChild(opcao);

        });

        area.appendChild(seletor);

        const botoes = document.createElement("div");
        botoes.className = "botoes-registro-atividade";

        const botaoPresenca = document.createElement("button");
        botaoPresenca.type = "button";
        botaoPresenca.textContent = "Registrar presença";
        botaoPresenca.className = "botao-registrar-presenca";

        const botaoConclusao = document.createElement("button");
        botaoConclusao.type = "button";
        botaoConclusao.textContent = "Registrar conclusão";
        botaoConclusao.className = "botao-registrar-conclusao";

        const mensagem = criarTexto(
            "p",
            "mensagem-registro-atividade",
            atividadesAtivas.length
                ? ""
                : "Cadastre uma atividade ativa para liberar os registros."
        );

        botaoPresenca.disabled = atividadesAtivas.length === 0;
        botaoConclusao.disabled = atividadesAtivas.length === 0;

        botaoPresenca.addEventListener("click", function () {

            registrarAtividade(
                aluno,
                seletor,
                "attendance",
                botaoPresenca,
                botaoConclusao,
                mensagem
            );

        });

        botaoConclusao.addEventListener("click", function () {

            registrarAtividade(
                aluno,
                seletor,
                "completion",
                botaoPresenca,
                botaoConclusao,
                mensagem
            );

        });

        botoes.appendChild(botaoPresenca);
        botoes.appendChild(botaoConclusao);

        area.appendChild(botoes);
        area.appendChild(mensagem);

        return area;

    }

    // REGISTRAR PRESENÇA OU CONCLUSÃO NO BANCO
    async function registrarAtividade(
        aluno,
        seletor,
        tipo,
        botaoPresenca,
        botaoConclusao,
        mensagem
    ) {

        const atividadeId = seletor.value;

        if (!atividadeId) {

            mensagem.textContent =
                "Selecione uma atividade antes de registrar.";

            return;

        }

        const nomeRegistro = tipo === "attendance"
            ? "presença"
            : "conclusão da atividade";

        if (!window.confirm(
            `Deseja registrar ${nomeRegistro} para ${aluno.nome}?`
        )) {
            return;
        }

        botaoPresenca.disabled = true;
        botaoConclusao.disabled = true;

        mensagem.textContent = "Salvando registro...";

        try {

            const { data, error } = await db.rpc(
                "register_activity_record",
                {
                    p_activity_id: atividadeId,
                    p_student_id: aluno.id,
                    p_record_type: tipo
                }
            );

            if (error) throw error;

            if (data !== true) {
                throw new Error("O registro não foi confirmado.");
            }

            alert(
                tipo === "attendance"
                    ? "Presença registrada com sucesso!"
                    : "Conclusão registrada com sucesso!"
            );

            await carregarAlunos();

        } catch (erro) {

            console.error("Erro ao registrar atividade:", erro);

            mensagem.textContent =
                erro.message && erro.message.includes("já foi realizado")
                    ? "Este registro já foi realizado para essa atividade."
                    : "Não foi possível registrar. Verifique os dados e tente novamente.";

            botaoPresenca.disabled = false;
            botaoConclusao.disabled = false;

        }

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

            // CONTROLES DE REGISTRO
            cartao.appendChild(
                criarControlesRegistro(aluno)
            );

            listaAlunos.appendChild(cartao);

        });

    }

    // FORMATAR DATA E HORÁRIO
    function formatarData(data) {

        if (!data) return "Horário não informado";

        return new Date(data).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });

    }

    // CARREGAR ATIVIDADES
    async function carregarAtividades() {

        listaAtividades.innerHTML =
            "<p>Carregando atividades...</p>";

        const { data: dadosAtividades, error } = await db.rpc(
            "get_activities_for_staff"
        );

        if (error) throw error;

        atividades = dadosAtividades || [];

        listaAtividades.innerHTML = "";

        if (atividades.length === 0) {

            listaAtividades.innerHTML = `
                <div class="nenhum-aluno">
                    <h3>Nenhuma atividade cadastrada</h3>
                    <p>As atividades criadas aparecerão aqui.</p>
                </div>
            `;

        } else {

            atividades.forEach(function (atividade) {

                const cartao = document.createElement("article");
                cartao.className = "cartao-aluno-representante";

                const dados = document.createElement("div");

                const categoria =
                    atividade.category === "esporte" ? "Esporte" : "Estudo";

                dados.appendChild(
                    criarTexto("h3", "", atividade.title)
                );

                dados.appendChild(
                    criarTexto("p", "", `Categoria: ${categoria}`)
                );

                dados.appendChild(
                    criarTexto(
                        "p",
                        "",
                        atividade.description || "Sem descrição."
                    )
                );

                dados.appendChild(
                    criarTexto(
                        "p",
                        "",
                        `Início: ${formatarData(atividade.starts_at)}`
                    )
                );

                dados.appendChild(
                    criarTexto(
                        "p",
                        "",
                        `Término: ${formatarData(atividade.ends_at)}`
                    )
                );

                dados.appendChild(
                    criarTexto(
                        "p",
                        "",
                        atividade.is_active ? "Atividade ativa" : "Atividade inativa"
                    )
                );

                cartao.appendChild(dados);
                listaAtividades.appendChild(cartao);

            });

        }

        // ATUALIZAR OS CONTROLES DOS CARTÕES DE ALUNOS
        mostrarAlunos();

    }

    // CADASTRAR NOVA ATIVIDADE
    formularioAtividade.addEventListener("submit", async function (event) {

        event.preventDefault();

        const titulo =
            document.getElementById("atividade-titulo").value.trim();

        const descricao =
            document.getElementById("atividade-descricao").value.trim();

        const categoria =
            document.getElementById("atividade-categoria").value;

        const inicio =
            document.getElementById("atividade-inicio").value;

        const fim =
            document.getElementById("atividade-fim").value;

        if (!titulo || !categoria || !inicio || !fim) {

            mensagemAtividade.textContent =
                "Preencha todos os campos obrigatórios.";

            return;

        }

        const dataInicio = new Date(inicio);
        const dataFim = new Date(fim);

        if (
            Number.isNaN(dataInicio.getTime()) ||
            Number.isNaN(dataFim.getTime())
        ) {

            mensagemAtividade.textContent =
                "Informe datas e horários válidos.";

            return;

        }

        if (dataFim <= dataInicio) {

            mensagemAtividade.textContent =
                "O término deve ser posterior ao início.";

            return;

        }

        const botaoEnviar =
            formularioAtividade.querySelector('button[type="submit"]');

        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Cadastrando...";

        mensagemAtividade.textContent = "";

        try {

            const { data, error } = await db.rpc("create_activity", {

                p_title: titulo,
                p_description: descricao || null,
                p_category: categoria,
                p_starts_at: dataInicio.toISOString(),
                p_ends_at: dataFim.toISOString()

            });

            if (error) throw error;

            if (!data) {
                throw new Error("A atividade não foi cadastrada.");
            }

            mensagemAtividade.textContent =
                "Atividade cadastrada com sucesso!";

            formularioAtividade.reset();

            await carregarAtividades();

        } catch (erro) {

            console.error("Erro ao cadastrar atividade:", erro);

            mensagemAtividade.textContent =
                "Não foi possível cadastrar a atividade. Verifique os dados e tente novamente.";

        } finally {

            botaoEnviar.disabled = false;
            botaoEnviar.textContent = "Cadastrar atividade";

        }

    });
// ENVIAR NOTIFICAÇÃO PARA UM ALUNO

formularioNotificacao.addEventListener("submit", async function (event) {

    event.preventDefault();

    const alunoId = seletorNotificacao.value;
    const titulo = tituloNotificacao.value.trim();
    const mensagem = textoNotificacao.value.trim();

    if (!alunoId || !titulo || !mensagem) {

        mensagemNotificacao.textContent =
            "Preencha todos os campos antes de enviar.";

        return;

    }

    botaoEnviarNotificacao.disabled = true;
    botaoEnviarNotificacao.textContent = "Enviando...";

    mensagemNotificacao.textContent = "";

    try {

        const { data, error } = await db.rpc(
            "send_notification",
            {
                p_user_id: alunoId,
                p_title: titulo,
                p_message: mensagem
            }
        );

        if (error) throw error;

        if (!data) {
            throw new Error("A notificação não foi confirmada.");
        }

        mensagemNotificacao.textContent =
            "Notificação enviada com sucesso!";

        formularioNotificacao.reset();

    } catch (erro) {

        console.error("Erro ao enviar notificação:", erro);

        mensagemNotificacao.textContent =
            erro.message || "Não foi possível enviar a notificação.";

    } finally {

        botaoEnviarNotificacao.disabled = false;
        botaoEnviarNotificacao.textContent = "Enviar notificação";

    }

});
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
