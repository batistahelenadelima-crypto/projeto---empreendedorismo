
document.addEventListener("DOMContentLoaded", async function () {

    const db = window.supabaseClient;

    if (!db) {
        console.error("Supabase não foi carregado.");
        return;
    }

    // ELEMENTOS DA PÁGINA

    const saudacao = document.getElementById("saudacao-perfil");
    const avatar = document.getElementById("avatar-perfil");
    const nome = document.getElementById("nome-perfil");
    const dados = document.getElementById("dados-perfil");

    const totalPontos = document.getElementById("total-pontos-perfil");
    const totalPresencas = document.getElementById("total-presencas-perfil");
    const totalAtividades = document.getElementById("total-atividades-perfil");

    const preferenciaEsporte = document.getElementById("preferencia-esporte");
    const preferenciaEstudo = document.getElementById("preferencia-estudo");

    const statusEsporte = document.getElementById("status-esporte");
    const statusEstudo = document.getElementById("status-estudo");

    const tituloConquistas = document.getElementById("titulo-conquistas");
    const textoConquistas = document.getElementById("texto-conquistas");

    // VERIFICAR LOGIN

    const { data: sessaoData, error: erroSessao } =
        await db.auth.getSession();

    if (erroSessao || !sessaoData.session) {
        window.location.href = "login.html";
        return;
    }

    const usuario = sessaoData.session.user;

    // BUSCAR PERFIL

    const { data: perfil, error: erroPerfil } = await db
        .from("profiles")
        .select(`
            full_name,
            age,
            school_year,
            class_group,
            participation,
            sport_preference,
            subject_preferences
        `)
        .eq("id", usuario.id)
        .single();

    if (erroPerfil || !perfil) {
        console.error("Erro ao carregar perfil:", erroPerfil);
        nome.textContent = "Não foi possível carregar seu perfil.";
        dados.textContent = "Tente entrar novamente.";
        return;
    }

    // MOSTRAR DADOS DO ESTUDANTE

    const primeiroNome = perfil.full_name.split(" ")[0];

    saudacao.textContent = `Olá, ${primeiroNome}!`;
    nome.textContent = perfil.full_name;
    avatar.textContent = primeiroNome.charAt(0).toUpperCase();

    dados.textContent =
        `${perfil.age} anos · ${perfil.school_year} · Turma ${perfil.class_group}`;

    // IDENTIFICAR ÁREAS DE PARTICIPAÇÃO

    const participacao = String(perfil.participation || "")
        .toLowerCase();

    const participaEsporte =
        participacao.includes("esporte") ||
        participacao.includes("ambos") ||
        participacao.includes("tudo");

    const participaEstudo =
        participacao.includes("estudo") ||
        participacao.includes("ambos") ||
        participacao.includes("tudo");

    preferenciaEsporte.textContent =
        perfil.sport_preference || "Nenhuma modalidade informada.";

    let materias = perfil.subject_preferences;

    if (Array.isArray(materias)) {
        materias = materias.join(", ");
    }

    preferenciaEstudo.textContent =
        materias || "Nenhuma matéria informada.";

    statusEsporte.textContent = participaEsporte
        ? "Participante da área de esportes"
        : "Não participa desta área";

    statusEstudo.textContent = participaEstudo
        ? "Participante da área de estudos"
        : "Não participa desta área";

    // BUSCAR PONTOS

    const { data: registrosPontos, error: erroPontos } = await db
        .from("points_ledger")
        .select("points")
        .eq("student_id", usuario.id);

    if (erroPontos) {
        console.error("Erro ao buscar pontos:", erroPontos);
    } else {
        const somaPontos = registrosPontos.reduce(
            (total, registro) => total + Number(registro.points || 0),
            0
        );

        totalPontos.textContent = somaPontos;
    }

    // BUSCAR PRESENÇAS

    const { count: quantidadePresencas, error: erroPresencas } = await db
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("student_id", usuario.id);

    if (erroPresencas) {
        console.error("Erro ao buscar presenças:", erroPresencas);
    } else {
        totalPresencas.textContent = quantidadePresencas ?? 0;
    }

    // BUSCAR ATIVIDADES CONCLUÍDAS

    const { count: quantidadeAtividades, error: erroAtividades } = await db
        .from("activity_completions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", usuario.id);

    if (erroAtividades) {
        console.error("Erro ao buscar atividades:", erroAtividades);
    } else {
        totalAtividades.textContent = quantidadeAtividades ?? 0;
    }

    // ATUALIZAR MENSAGEM DE CONQUISTAS

    const pontos = Number(totalPontos.textContent) || 0;
    const presencas = Number(totalPresencas.textContent) || 0;
    const atividades = Number(totalAtividades.textContent) || 0;

    if (pontos > 0 || presencas > 0 || atividades > 0) {
        tituloConquistas.textContent = "Você já está construindo sua jornada!";
        textoConquistas.textContent =
            `Você acumula ${pontos} pontos, participou de ${presencas} atividades e concluiu ${atividades} tarefas. Continue participando!`;
    }

    // SAIR DA PLATAFORMA

    const botaoSair = document.getElementById("botao-sair");

    botaoSair.addEventListener("click", async function (event) {

        event.preventDefault();

        const { error } = await db.auth.signOut();

        if (error) {
            alert("Não foi possível sair da plataforma.");
            console.error(error);
            return;
        }

        window.location.href = "acesso.html";
    });

});
