// =====================================
// CONECTA+ | FUNÇÕES DE AUTENTICAÇÃO
// =====================================

const conectaSupabase = window.supabaseClient;

// CADASTRAR NOVO ALUNO
window.ConectaAuth = {

    async cadastrar(dados) {
        const { nome, email, senha, idade, ano, turma, participacao, esporte, materias } = dados;

        if (!nome || !email || !senha) {
            throw new Error("Preencha nome, e-mail e senha.");
        }

        if (senha.length < 8) {
            throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        }

        const { data, error } = await conectaSupabase.auth.signUp({
            email: email,
            password: senha,

            options: {
                data: {
                    full_name: nome,
                    age: idade ? Number(idade) : null,
                    school_year: ano ? Number(ano) : null,
                    class_group: turma || null,
                    participation: participacao || null,
                    sport_preference: esporte || null,
                    subject_preferences: materias || []
                }
            }
        });

        if (error) {
            throw error;
        }

        return data;
    },

    // ENTRAR NA CONTA
    async entrar(email, senha) {
        const { data, error } = await conectaSupabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            throw error;
        }

        return data;
    },

    // SAIR DA CONTA
    async sair() {
        const { error } = await conectaSupabase.auth.signOut();

        if (error) {
            throw error;
        }
    },

    // VERIFICAR QUEM ESTÁ LOGADO
    async usuarioAtual() {
        const { data, error } = await conectaSupabase.auth.getUser();

        if (error) {
            throw error;
        }

        return data.user;
    },

    // VERIFICAR A SESSÃO
    async sessaoAtual() {
        const { data, error } = await conectaSupabase.auth.getSession();

        if (error) {
            throw error;
        }

        return data.session;
    }
};
