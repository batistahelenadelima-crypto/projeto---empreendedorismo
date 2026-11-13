
const SUPABASE_URL = "https://qwzeouzrxvnkqftrqhwm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xPaAUcxphfFwFa0cgc2juA_sCva5TA0";

if (!window.supabase) {
    throw new Error("A biblioteca do Supabase não foi carregada.");
}

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
