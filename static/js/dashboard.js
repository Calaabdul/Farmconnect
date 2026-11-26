
 // ==========================================
 // 1. AUTHENTICATION
 // ==========================================

async function getValidAccessToken() {
    let accessToken = sessionStorage.getItem("access");
    const refreshToken = sessionStorage.getItem("refresh");

    if (!refreshToken) {
        sessionStorage.clear();
        window.location.href = "/login/";
        throw new Error("Your session has expired. Please log in again.");
    }

    let response = await fetch("/api/accounts/me/", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (response.ok) {
        return accessToken;
    }

    response = await fetch("/api/token/refresh/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ refresh: refreshToken })
    });

    const data = await response.json();

    if (!response.ok || !data.access) {
        sessionStorage.clear();
        window.location.href = "/login/";
        throw new Error("Your session has expired. Please log in again.");
    }

    accessToken = data.access;
    sessionStorage.setItem("access", accessToken);

    if (data.refresh) {
        sessionStorage.setItem("refresh", data.refresh);
    }

    return accessToken;
}


// ==========================================
// 2. DASHBOARD INITIAL SETUP
// ==========================================

const currentUser = JSON.parse(
    sessionStorage.getItem("user") || "null"
);

const currentPath = window.location.pathname;
const isFarmerPage = currentPath.includes("/farmer/");
const expectedRole = isFarmerPage ? "FARMER" : "BUYER";

if (!currentUser || currentUser.role !== expectedRole) {
    window.location.href = "/login/";
}

let produceCategories = [];

async function apiGet(url) {
    const token = await getValidAccessToken();

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Unable to load dashboard data.");
    }

    return response.json();
}


// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

function renderEmpty(container, message) {
    container.textContent = message;
}

function statusBadge(status) {
    const cssClass = {
        PENDING: "status-pending",
        ACCEPTED: "status-accepted",
        REJECTED: "status-rejected"
    }[status] || "";

    const badge = document.createElement("span");
    badge.className = `badge ${cssClass}`;
    badge.textContent = status;

    return badge;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

async function getErrorMessage(response) {
    try {
        const data = await response.json();

        if (data.detail) {
            return data.detail;
        }

        return Object.entries(data)
            .map(([field, errors]) => {
                const message = Array.isArray(errors)
                    ? errors.join(", ")
                    : String(errors);

                return `${field}: ${message}`;
            })
            .join(" | ") || "Something went wrong.";

    } catch {
        return "Something went wrong. Please try again.";
    }
}


// ==========================================
// 4. LOAD FARMER DASHBOARD
// ==========================================

async function loadFarmerDashboard() {
    document.getElementById("farmerName").textContent =
        currentUser.first_name || currentUser.username;

    const [listingData, inquiryData] = await Promise.all([
        apiGet("/api/marketplace/produce/?mine=1"),
        apiGet("/api/inquiries/")
    ]);

    const listings = listingData.results || listingData;
    const inquiries = inquiryData.results || inquiryData;

    document.getElementById("listingCount").textContent =
        listings.length;

    document.getElementById("pendingCount").textContent =
        inquiries.filter(item => item.status === "PENDING").length;

    document.getElementById("acceptedCount").textContent =
        inquiries.filter(item => item.status === "ACCEPTED").length;

    // Render farmer listings.
    const listingContainer = document.getElementById("farmerListings");
    listingContainer.replaceChildren();

    if (!listings.length) {
        renderEmpty(
            listingContainer,
            "You have not created any listings yet."
        );
    } else {
        listings.forEach(listing => {
            const item = createElement("div", "col-md-6");

            const card = createElement("div", "dashboard-item");

            const title = createElement("h6", "", listing.name);

            const details = createElement(
                "p",
                "text-muted mb-2",
                `${listing.quantity} ${listing.unit} · $${Number(listing.price).toFixed(2)}`
            );

            const status = createElement(
                "span",
                "badge " + (
                    listing.status === "AVAILABLE"
                        ? "status-accepted"
                        : "status-rejected"
                ),
                listing.status
            );

            const actions = createElement(
                "div",
                "d-flex gap-2 mt-3"
            );

            const editButton = createElement(
                "button",
                "btn btn-outline-success btn-sm",
                "Edit"
            );

            editButton.type = "button";

            editButton.addEventListener("click", () => {
                showEditForm(card, listing);
            });

            const deleteButton = createElement(
                "button",
                "btn btn-outline-danger btn-sm",
                "Delete"
            );

            deleteButton.type = "button";

            deleteButton.addEventListener("click", () => {
                deleteListing(listing.id);
            });

            actions.append(editButton, deleteButton);

            card.append(title, details, status, actions);
            item.appendChild(card);
            listingContainer.appendChild(item);
        });
    }

    // Render farmer inquiries.
    const inquiryContainer = document.getElementById("farmerInquiries");
    inquiryContainer.replaceChildren();

    if (!inquiries.length) {
        renderEmpty(
            inquiryContainer,
            "You have not received any inquiries yet."
        );
    } else {
        inquiries.forEach(inquiry => {
            const item = createElement(
                "div",
                "dashboard-item mb-3"
            );

            const title = createElement(
                "h6",
                "",
                inquiry.produce_name
            );

            const details = createElement(
                "p",
                "text-muted mb-2",
                `${inquiry.buyer_name} requested ${inquiry.quantity}`
            );

            const status = statusBadge(inquiry.status);

            item.append(title, details, status);

            if (inquiry.status === "PENDING") {
                const actions = createElement(
                    "div",
                    "d-flex gap-2 mt-3"
                );

                const acceptButton = createElement(
                    "button",
                    "btn btn-success btn-sm",
                    "Accept"
                );

                acceptButton.type = "button";

                acceptButton.addEventListener("click", () => {
                    respondToInquiry(inquiry.id, "ACCEPTED");
                });

                const rejectButton = createElement(
                    "button",
                    "btn btn-outline-danger btn-sm",
                    "Reject"
                );

                rejectButton.type = "button";

                rejectButton.addEventListener("click", () => {
                    respondToInquiry(inquiry.id, "REJECTED");
                });

                actions.append(acceptButton, rejectButton);
                item.appendChild(actions);
            }

            inquiryContainer.appendChild(item);
        });
    }
}


// ==========================================
// 5. EDIT A PRODUCE LISTING
// ==========================================

function showEditForm(card, listing) {
    // Prevent multiple edit forms on the same listing.
    if (card.querySelector(".listing-edit-form")) {
        return;
    }

    const form = createElement(
        "form",
        "listing-edit-form mt-3"
    );

    const heading = createElement(
        "h6",
        "mb-3",
        "Edit Produce Listing"
    );

    form.appendChild(heading);

    function addInput(labelText, name, value, type = "text") {
        const wrapper = createElement("div", "mb-3");

        const label = createElement(
            "label",
            "form-label",
            labelText
        );

        const input = createElement(
            "input",
            "form-control"
        );

        input.type = type;
        input.name = name;
        input.value = value ?? "";
        input.required = true;

        if (type === "number") {
            input.min = "0.01";
            input.step = "0.01";
        }

        wrapper.append(label, input);
        form.appendChild(wrapper);
    }

    addInput("Produce name", "name", listing.name);
    addInput("Description", "description", listing.description);

    // Category selection.
    const categoryWrapper = createElement("div", "mb-3");

    const categoryLabel = createElement(
        "label",
        "form-label",
        "Category"
    );

    const categorySelect = createElement(
        "select",
        "form-select"
    );

    categorySelect.name = "category";
    categorySelect.required = true;

    const placeholder = createElement(
        "option",
        "",
        "Select category"
    );

    placeholder.value = "";
    categorySelect.appendChild(placeholder);

    produceCategories.forEach(category => {
        const option = createElement(
            "option",
            "",
            category.name
        );

        option.value = category.id;
        option.selected = String(category.id) === String(listing.category);

        categorySelect.appendChild(option);
    });

    categoryWrapper.append(categoryLabel, categorySelect);
    form.appendChild(categoryWrapper);

    addInput("Price (USD)", "price", listing.price, "number");
    addInput("Quantity", "quantity", listing.quantity, "number");

    // Unit selection.
    const unitWrapper = createElement("div", "mb-3");

    const unitLabel = createElement(
        "label",
        "form-label",
        "Unit"
    );

    const unitSelect = createElement(
        "select",
        "form-select"
    );

    unitSelect.name = "unit";
    unitSelect.required = true;

    const units = [
        ["KG", "Kilograms"],
        ["TON", "Tonnes"],
        ["BAG", "Bags"],
        ["CRATE", "Crates"],
        ["TUBER", "Tubers"],
        ["BASKET", "Baskets"]
    ];

    units.forEach(([value, label]) => {
        const option = createElement("option", "", label);
        option.value = value;
        option.selected = value === listing.unit;
        unitSelect.appendChild(option);
    });

    unitWrapper.append(unitLabel, unitSelect);
    form.appendChild(unitWrapper);

    addInput("Location", "location", listing.location);

    const message = createElement(
        "div",
        "edit-message small mb-2"
    );

    const buttons = createElement(
        "div",
        "d-flex gap-2"
    );

    const saveButton = createElement(
        "button",
        "btn btn-success btn-sm",
        "Save Changes"
    );

    saveButton.type = "submit";

    const cancelButton = createElement(
        "button",
        "btn btn-secondary btn-sm",
        "Cancel"
    );

    cancelButton.type = "button";

    cancelButton.addEventListener("click", () => {
        form.remove();
    });

    buttons.append(saveButton, cancelButton);

    form.append(message, buttons);
    card.appendChild(form);

    form.addEventListener("submit", async event => {
        event.preventDefault();

        saveButton.disabled = true;
        message.textContent = "Saving changes...";

        const formData = new FormData(form);

        const updatedListing = {
            name: formData.get("name"),
            description: formData.get("description"),
            category: formData.get("category"),
            price: formData.get("price"),
            quantity: formData.get("quantity"),
            unit: formData.get("unit"),
            location: formData.get("location")
        };

        try {
            const token = await getValidAccessToken();

            const response = await fetch(
                `/api/marketplace/produce/${listing.id}/`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(updatedListing)
                }
            );

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }

            alert("Listing updated successfully!");
            window.location.reload();

        } catch (error) {
            message.textContent = error.message;
            saveButton.disabled = false;
        }
    });
}


// ==========================================
// 6. DELETE A PRODUCE LISTING
// ==========================================

async function deleteListing(listingId) {
    const confirmed = window.confirm(
        "Are you sure you want to delete this listing? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
        const token = await getValidAccessToken();

        const response = await fetch(
            `/api/marketplace/produce/${listingId}/`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(await getErrorMessage(response));
        }

        alert("Listing deleted successfully!");
        window.location.reload();

    } catch (error) {
        alert(error.message);
        console.error("Listing deletion error:", error);
    }
}


// ==========================================
// 7. LOAD BUYER DASHBOARD
// ==========================================

async function loadBuyerDashboard() {
    document.getElementById("buyerName").textContent =
        currentUser.first_name || currentUser.username;

    const data = await apiGet("/api/inquiries/");
    const inquiries = data.results || data;

    document.getElementById("buyerTotal").textContent =
        inquiries.length;

    document.getElementById("buyerPending").textContent =
        inquiries.filter(item => item.status === "PENDING").length;

    document.getElementById("buyerAccepted").textContent =
        inquiries.filter(item => item.status === "ACCEPTED").length;

    const container = document.getElementById("buyerInquiries");
    container.replaceChildren();

    if (!inquiries.length) {
        renderEmpty(container, "You have not sent any inquiries yet.");
        return;
    }

    inquiries.forEach(inquiry => {
        const item = createElement("div", "dashboard-item");

        const title = createElement(
            "h6",
            "",
            inquiry.produce_name
        );

        const details = createElement(
            "p",
            "text-muted mb-2",
            `Farmer: ${inquiry.farmer_name} · Quantity: ${inquiry.quantity}`
        );

        const status = statusBadge(inquiry.status);

        item.append(title, details, status);
        container.appendChild(item);
    });
}


// ==========================================
// 8. LOAD PRODUCE CATEGORIES
// ==========================================

async function loadProduceCategories() {
    const categorySelect = document.getElementById("produceCategory");

    if (!categorySelect) return;

    try {
        const data = await apiGet("/api/marketplace/categories/");
        produceCategories = data.results || data;

        categorySelect.replaceChildren();

        const placeholder = createElement(
            "option",
            "",
            "Select category"
        );

        placeholder.value = "";
        categorySelect.appendChild(placeholder);

        produceCategories.forEach(category => {
            const option = createElement(
                "option",
                "",
                category.name
            );

            option.value = category.id;
            categorySelect.appendChild(option);
        });

    } catch (error) {
        categorySelect.replaceChildren();

        const option = createElement(
            "option",
            "",
            "Could not load categories"
        );

        option.value = "";
        categorySelect.appendChild(option);

        console.error("Category loading error:", error);
    }
}


// ==========================================
// 9. CREATE PRODUCE LISTING
// ==========================================

const produceForm = document.getElementById("produceForm");
const produceFormMessage = document.getElementById("produceFormMessage");

if (produceForm) {
    produceForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (produceForm.dataset.submitting === "true") {
            return;
        }

        produceForm.dataset.submitting = "true";

        const submitButton = produceForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;
        produceFormMessage.textContent = "Publishing listing...";

        try {
            const token = await getValidAccessToken();
            const formData = new FormData(produceForm);

            const response = await fetch("/api/marketplace/produce/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }

            produceFormMessage.textContent =
                "Listing published successfully!";

            produceForm.reset();

            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            produceFormMessage.textContent = error.message;
            console.error("Listing creation error:", error);

        } finally {
            produceForm.dataset.submitting = "false";
            submitButton.disabled = false;
        }
    });
}


// ==========================================
// 10. RESPOND TO BUYER INQUIRIES
// ==========================================

async function respondToInquiry(inquiryId, newStatus) {
    const action = newStatus === "ACCEPTED" ? "accept" : "reject";

    const confirmed = window.confirm(
        `Are you sure you want to ${action} this inquiry?`
    );

    if (!confirmed) return;

    try {
        const token = await getValidAccessToken();

        const response = await fetch(
            `/api/inquiries/${inquiryId}/respond/`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        if (!response.ok) {
            throw new Error(await getErrorMessage(response));
        }

        alert(`Inquiry ${action}ed successfully!`);
        window.location.reload();

    } catch (error) {
        alert(error.message);
        console.error("Inquiry response error:", error);
    }
}


// ==========================================
// 11. INITIALIZE DASHBOARD
// ==========================================

async function initializeDashboard() {
    const message = document.getElementById("dashboardMessage");

    try {
        if (isFarmerPage) {
            await Promise.all([
                loadProduceCategories(),
                loadFarmerDashboard()
            ]);
        } else {
            await loadBuyerDashboard();
        }

    } catch (error) {
        message.textContent = error.message;
        message.classList.remove("d-none");

        console.error("Dashboard loading error:", error);
    }
}

if (currentUser && currentUser.role === expectedRole) {
    initializeDashboard();
}
