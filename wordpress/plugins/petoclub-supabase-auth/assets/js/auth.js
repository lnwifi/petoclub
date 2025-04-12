// Inicializar cliente de Supabase
const supabase = supabase.createClient(
    petoClubAuth.supabaseUrl,
    petoClubAuth.supabaseAnonKey
);

// Función para obtener la URL de redirección después del login
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutRedirect = urlParams.get('checkout_redirect');
    return checkoutRedirect || petoClubAuth.defaultRedirectUrl || '/';
}

// Función para manejar el inicio de sesión
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;

    try {
        // Autenticar con Supabase
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Si la autenticación con Supabase es exitosa, sincronizar con WordPress
        const response = await fetch(petoClubAuth.ajaxUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'petoclub_supabase_login',
                nonce: petoClubAuth.nonce,
                email,
                password
            })
        });

        const result = await response.json();

        if (result.success) {
            // Almacenar el token de Supabase
            const session = await supabase.auth.getSession();
            if (session?.data?.session) {
                localStorage.setItem('supabase.auth.token', session.data.session.access_token);
            }
            
            // Redirigir al usuario
            window.location.href = getRedirectUrl();
        } else {
            throw new Error(result.data);
        }
    } catch (error) {
        console.error('Error de inicio de sesión:', error.message);
        alert('Error al iniciar sesión: ' + error.message);
    }
}

// Función para manejar el registro
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    const fullName = form.querySelector('[name="full_name"]').value;

    try {
        // Registrar en Supabase
        const { data: { user }, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) throw error;

        // Si el registro en Supabase es exitoso, sincronizar con WordPress
        const response = await fetch(petoClubAuth.ajaxUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'petoclub_supabase_register',
                nonce: petoClubAuth.nonce,
                email,
                password,
                full_name: fullName
            })
        });

        const result = await response.json();

        if (result.success) {
            // Almacenar el token de Supabase
            const session = await supabase.auth.getSession();
            if (session?.data?.session) {
                localStorage.setItem('supabase.auth.token', session.data.session.access_token);
            }
            
            // Redirigir al usuario
            window.location.href = getRedirectUrl();
        } else {
            throw new Error(result.data);
        }
    } catch (error) {
        console.error('Error de registro:', error.message);
        alert('Error al registrar: ' + error.message);
    }
}

// Agregar event listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#petoclub-login-form');
    const registerForm = document.querySelector('#petoclub-register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});