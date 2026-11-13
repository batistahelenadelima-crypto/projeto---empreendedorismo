
// =============================================
// CONECTA+ | AUTENTICAÇÃO
// =============================================

const conectaSupabase = window.supabaseClient;


// =============================================
// VERIFICAR CONEXÃO
// =============================================

if (!conectaSupabase) {
    console.error(
        "Conecta+: cliente do Supabase não encontrado."
    );
}


// =============================================
// FUNÇÕES DE AUTENTICAÇÃO
// =============================================

window.ConectaAuth = {

    // CADASTRAR NOVO ALUNO
    async cadastrar(dados) {

        if (!conectaSupabase) {
            throw new Error("A conexão com o Supabase não foi carregada.");
        }

        const { data, error } =
            await conectaSupabase.auth.signUp({

                email: dados.email,
                password: dados.senha,

                options: {

                    emailRedirectTo:
                        "https://batistahelenadelima-crypto.github.io/projeto---empreendedorismo/login.html",

                    data: {
                        full_name: dados.nome,
                        age: Number(dados.idade),
                        school_year: Number(dados.ano),
                        class_group: dados.turma,
                        participation: dados.participacao,
                        sport_preference: dados.esporte,
                        subject_preferences: dados.materias
                    }

                }

            });

        if (error) throw error;

        return data;
    },


    // ENTRAR NA CONTA
    async entrar(email, senha) {

        const { data, error } =
            await conectaSupabase.auth.signInWithPassword({
                email: email,
                password: senha
            });

        if (error) throw error;

        return data;
    },


    // SAIR DA CONTA
    async sair() {

        const { error } =
            await conectaSupabase.auth.signOut();

        if (error) throw error;
    },


    // USUÁRIO ATUAL
    async usuarioAtual() {

        const { data, error } =
            await conectaSupabase.auth.getUser();

        if (error) throw error;

        return data.user;
    }

};


// =============================================
// FORMULÁRIO DE INSCRIÇÃO
// =============================================

const formularioInscricao =
    document.querySelector(".form-inscricao");

if (formularioInscricao) {

    formularioInscricao.addEventListener(
        "submit",
        async function(event) {

            // IMPEDIR ATUALIZAÇÃO AUTOMÁTICA DA PÁGINA
            event.preventDefault();

            const mensagem =
                document.getElementById("mensagem-inscricao");

            const botao =
                formularioInscricao.querySelector(
                    'button[type="submit"]'
                );

            if (!mensagem || !botao) {
                console.error(
                    "Elementos do formulário de inscrição não encontrados."
                );
                return;
            }

            if (!conectaSupabase) {
                mensagem.textContent =
                    "Não foi possível conectar ao sistema. Atualize a página e tente novamente.";
                return;
            }

            const senha =
                document.getElementById("senha").value;

            const confirmarSenha =
                document.getElementById("confirmar-senha").value;


            // VERIFICAR SENHAS

            if (senha !== confirmarSenha) {

                mensagem.textContent =
                    "As senhas não coincidem.";

                return;
            }

            if (senha.length < 8) {

                mensagem.textContent =
                    "A senha precisa ter pelo menos 8 caracteres.";

                return;
            }


            // COLETAR DADOS

            const materiasTexto =
                document.getElementById("materias").value;

            const dados = {

                nome:
                    document.getElementById("nome").value.trim(),

                email:
                    document.getElementById("email").value.trim(),

                senha: senha,

                idade:
                    document.getElementById("idade").value,

                ano:
                    document.getElementById("ano").value,

                turma:
                    document.getElementById("turma").value.trim(),

                participacao:
                    document.getElementById("participacao").value,

                esporte:
                    document.getElementById("esporte").value.trim(),

                materias: materiasTexto
                    .split(",")
                    .map(item => item.trim())
                    .filter(item => item !== "")

            };


            // ENVIAR CADASTRO

            botao.disabled = true;
            botao.textContent = "Enviando inscrição...";

            mensagem.textContent = "";

            try {

                const resultado =
                    await window.ConectaAuth.cadastrar(dados);

                if (resultado.session) {

                    mensagem.textContent =
                        "Conta criada! Sua inscrição está aguardando aprovação do representante.";

                } else {

                    mensagem.textContent =
                        "Cadastro realizado! Confira seu e-mail e confirme sua conta. Depois, sua inscrição ficará aguardando aprovação do representante.";

                }

                formularioInscricao.reset();

            } catch (error) {

                console.error("Erro no cadastro:", error);

                mensagem.textContent =
                    "Não foi possível realizar o cadastro: " +
                    error.message;

            } finally {

                botao.disabled = false;
                botao.textContent = "Enviar inscrição →";

            }

        }
    );

}


// =============================================
// FORMULÁRIO DE LOGIN
// =============================================

const formularioLogin =
    document.querySelector(".form-login");

if (formularioLogin) {

    formularioLogin.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const mensagem =
                document.getElementById("mensagem-login");

            const botao =
                formularioLogin.querySelector(
                    'button[type="submit"]'
                );

            const email =
                document.getElementById("email").value.trim();

            const senha =
                document.getElementById("senha").value;

            botao.disabled = true;
            botao.textContent = "Entrando...";

            mensagem.textContent = "";

            try {

                // REALIZAR LOGIN

                const resultado =
                    await window.ConectaAuth.entrar(email, senha);

                const usuario = resultado.user;


                // VERIFICAR REPRESENTANTE OU ADMINISTRADOR

                const { data: staff, error: erroStaff } =
                    await conectaSupabase.rpc("is_staff");

                if (erroStaff) throw erroStaff;

                if (staff === true) {

                    window.location.href = "representante.html";
                    return;

                }


                // VERIFICAR INSCRIÇÃO DO ALUNO

                const { data: inscricao, error } =
                    await conectaSupabase
                        .from("enrollments")
                        .select("status")
                        .eq("student_id", usuario.id)
                        .maybeSingle();

                if (error) throw error;


                if (!inscricao) {

                    await window.ConectaAuth.sair();

                    mensagem.textContent =
                        "Não encontramos sua inscrição. Entre em contato com o representante.";

                    return;
                }


                if (inscricao.status === "pending") {

                    await window.ConectaAuth.sair();

                    mensagem.textContent =
                        "Sua inscrição ainda está aguardando aprovação do representante.";

                    return;
                }


                if (inscricao.status === "rejected") {

                    await window.ConectaAuth.sair();

                    mensagem.textContent =
                        "Sua inscrição não foi aprovada. Entre em contato com o representante.";

                    return;
                }


                if (inscricao.status === "approved") {

                    mensagem.textContent =
                        "Login realizado! Redirecionando...";

                    window.location.href = "index.html";

                }

            } catch (error) {

                console.error("Erro no login:", error);

                mensagem.textContent =
                    "Não foi possível entrar: " + error.message;

            } finally {

                botao.disabled = false;
                botao.textContent = "Entrar na plataforma →";

            }

        }
    );

}

