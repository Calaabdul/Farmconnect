function logout() {
    sessionStorage.clear();
    window.location.href = "/";
}

const navAuth = document.getElementById("navAuth");

if (navAuth) {
    const user = JSON.parse(
        sessionStorage.getItem("user") || "null"
    );

    if (user) {
        const dashboard = document.createElement("a");

        dashboard.href = user.role === "FARMER"
            ? "/farmer/dashboard/"
            : "/buyer/dashboard/";

        dashboard.className = "btn btn-outline-success";
        dashboard.textContent = "Dashboard";

        const logoutButton = document.createElement("button");
        logoutButton.className = "btn btn-terracotta";
        logoutButton.textContent = "Logout";
        logoutButton.addEventListener("click", logout);

        navAuth.replaceChildren(dashboard, logoutButton);
    }
}