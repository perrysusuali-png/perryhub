// =====================================================
// PERRYHUB ADMIN LOGIN
// =====================================================

const PERRYHUB_API = "http://127.0.0.1:8000";

const loginForm =
    document.getElementById("adminLoginForm");

const usernameInput =
    document.getElementById("username");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");

const togglePassword =
    document.getElementById("togglePassword");


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(message, type) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.className =
        `login-message ${type}`;

}


// =====================================================
// PASSWORD VISIBILITY
// =====================================================

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        function () {

            if (
                passwordInput.type === "password"
            ) {

                passwordInput.type = "text";

                togglePassword.textContent =
                    "Hide";

            } else {

                passwordInput.type = "password";

                togglePassword.textContent =
                    "Show";

            }

        }
    );

}


// =====================================================
// LOGIN
// =====================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;


            if (!username || !password) {

                showMessage(
                    "Please enter your username and password.",
                    "error"
                );

                return;

            }


            loginButton.disabled = true;

            loginButton.textContent =
                "Signing In...";


            showMessage(
                "Authenticating...",
                "success"
            );


            try {

                const response =
                    await fetch(
                        `${PERRYHUB_API}/api/admin/login`,
                        {
                            method: "POST",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                username: username,
                                password: password
                            })
                        }
                    );


                const data =
                    await response.json();


                console.log(
                    "PerryHub login response:",
                    response.status,
                    data
                );


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Invalid username or password."
                    );

                }


                showMessage(
                    "Login successful. Opening dashboard...",
                    "success"
                );


                /*
                 * Give the browser a moment to store
                 * the authentication cookie before
                 * navigating to the dashboard.
                 */

                setTimeout(
                    function () {

                        window.location.href =
                            "admin.html";

                    },
                    800
                );


            } catch (error) {

                console.error(
                    "PerryHub login error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to connect to the PerryHub API.",
                    "error"
                );


                loginButton.disabled = false;

                loginButton.textContent =
                    "Sign In";

            }

        }
    );

}