
const AUTH_API = "/api/accounts/";

function showMessage(element, message, success = false) {
    element.textContent = message;
    element.classList.remove("d-none", "alert-danger", "alert-success");
    element.classList.add(success ? "alert-success" : "alert-danger");
}

function getErrorMessage(data) {
    return Object.entries(data)
        .map(([field, messages]) => {
            const text = Array.isArray(messages)
                ? messages.join(" ")
                : messages;

            return `${field}: ${text}`;
        })
        .join(" | ");
}


// ==========================================
// 1. SHOW FIELDS BASED ON ACCOUNT TYPE
// ==========================================

const roleSelect = document.getElementById("role");

if (roleSelect) {
    const farmerFields = document.getElementById("farmerFields");
    const buyerFields = document.getElementById("buyerFields");
    const farmName = document.getElementById("farmName");

    function updateRoleFields() {
        const role = roleSelect.value;

        farmerFields.classList.toggle("d-none", role !== "FARMER");
        buyerFields.classList.toggle("d-none", role !== "BUYER");

        farmName.required = role === "FARMER";
        farmName.disabled = role !== "FARMER";

        const businessName = buyerFields.querySelector(
            '[name="business_name"]'
        );

        businessName.disabled = role !== "BUYER";
    }

    roleSelect.addEventListener("change", updateRoleFields);

    updateRoleFields();
}


// ==========================================
// 2. REGISTRATION
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        const button = document.getElementById("registerButton");
        const message = document.getElementById("registerMessage");

        const formData = new FormData(registerForm);
        const payload = Object.fromEntries(formData.entries());

        // Remove fields that do not belong to the selected role.
        if (payload.role === "BUYER") {
            delete payload.farm_name;
        }

        if (payload.role === "FARMER") {
            delete payload.business_name;
        }

        button.disabled = true;
        button.textContent = "Creating account...";

        try {
            const response = await fetch(`${AUTH_API}register/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(getErrorMessage(data));
            }

            showMessage(
                message,
                "Account created successfully. Redirecting to login...",
                true
            );

            registerForm.reset();

            // Reset the role-specific fields after registration.
            if (roleSelect) {
                roleSelect.dispatchEvent(new Event("change"));
            }

            setTimeout(() => {
                window.location.href = "/login/";
            }, 1200);

        } catch (error) {
            showMessage(message, error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    });
}


// ==========================================
// 3. LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const button = document.getElementById("loginButton");
        const message = document.getElementById("loginMessage");

        const formData = new FormData(loginForm);

        // Login sends only username and password.
        const payload = {
            username: formData.get("username"),
            password: formData.get("password")
        };

        button.disabled = true;
        button.textContent = "Logging in...";

        try {
            const response = await fetch("/api/token/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error("Invalid username or password.");
            }

            sessionStorage.setItem("access", data.access);
            sessionStorage.setItem("refresh", data.refresh);

            // Retrieve the authenticated user's profile.
            const profileResponse = await fetch(`${AUTH_API}me/`, {
                headers: {
                    Authorization: `Bearer ${data.access}`
                }
            });

            if (!profileResponse.ok) {
                throw new Error(
                    "Could not retrieve your account profile."
                );
            }

            const user = await profileResponse.json();

            sessionStorage.setItem("user", JSON.stringify(user));

            // Send the user to the appropriate dashboard.
            if (user.role === "FARMER") {
                window.location.href = "/farmer/dashboard/";
            } else if (user.role === "BUYER") {
                window.location.href = "/buyer/dashboard/";
            } else {
                window.location.href = "/";
            }

        } catch (error) {
            sessionStorage.removeItem("access");
            sessionStorage.removeItem("refresh");
            sessionStorage.removeItem("user");

            showMessage(message, error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Login";
        }
    });
}


// ==========================================
// 4. LOGOUT
// ==========================================

function logout() {
    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    sessionStorage.removeItem("user");

    window.location.href = "/";
}
