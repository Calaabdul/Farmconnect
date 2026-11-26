
const API_URL = "/api/marketplace";
const INQUIRY_API_URL = "/api/inquiries/";
const AI_SEARCH_URL = "/api/ai-matching/search/";

const produceContainer = document.getElementById("produceContainer");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const emptyMessage = document.getElementById("emptyMessage");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const orderingFilter = document.getElementById("orderingFilter");

const aiSearchSection = document.getElementById("aiSearchSection");
const aiSearchForm = document.getElementById("aiSearchForm");
const aiSearchInput = document.getElementById("aiSearchInput");
const aiSearchButton = document.getElementById("aiSearchButton");
const aiSearchMessage = document.getElementById("aiSearchMessage");
const aiResultsSection = document.getElementById("aiResultsSection");
const aiResults = document.getElementById("aiResults");

let searchTimeout;


// ========================================
// AUTHENTICATION
// ========================================

function getCurrentUser() {
    try {
        return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}


async function getValidAccessToken() {
    const accessToken = sessionStorage.getItem("access");
    const refreshToken = sessionStorage.getItem("refresh");

    if (!accessToken || !refreshToken) {
        return null;
    }

    const checkResponse = await fetch("/api/accounts/me/", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (checkResponse.ok) {
        return accessToken;
    }

    if (checkResponse.status !== 401) {
        throw new Error("Unable to verify your login. Please try again.");
    }

    const refreshResponse = await fetch("/api/token/refresh/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            refresh: refreshToken
        })
    });

    if (!refreshResponse.ok) {
        sessionStorage.clear();
        window.location.href = "/login/";
        return null;
    }

    const data = await refreshResponse.json();

    sessionStorage.setItem("access", data.access);

    if (data.refresh) {
        sessionStorage.setItem("refresh", data.refresh);
    }

    return data.access;
}


// ========================================
// HTML SAFETY
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}


// ========================================
// NORMAL MARKETPLACE
// ========================================

async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories/`);

        if (!response.ok) {
            throw new Error("Could not load categories.");
        }

        const data = await response.json();
        const categories = data.results || data;

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });

    } catch (error) {
        console.error(error);
    }
}


async function loadProduce() {
    loadingMessage.classList.remove("d-none");
    errorMessage.classList.add("d-none");
    emptyMessage.classList.add("d-none");
    produceContainer.innerHTML = "";

    const params = new URLSearchParams();

    const search = searchInput.value.trim();
    const category = categoryFilter.value;
    const ordering = orderingFilter.value;

    if (search) params.append("search", search);
    if (category) params.append("category", category);
    if (ordering) params.append("ordering", ordering);

    try {
        const response = await fetch(
            `${API_URL}/produce/?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve produce.");
        }

        const data = await response.json();
        const listings = data.results || data;

        document.getElementById("resultCount").textContent =
            `${data.count ?? listings.length} listings`;

        if (listings.length === 0) {
            emptyMessage.classList.remove("d-none");
            return;
        }

        const currentUser = getCurrentUser();
        const isBuyer = currentUser?.role === "BUYER";
        const isLoggedIn = Boolean(currentUser);

        listings.forEach(listing => {
            const imageUrl = listing.image || "";

            let farmerDetails = "";

            if (isBuyer) {
                const phone = listing.farmer_phone || "";

                farmerDetails = `
                    <hr>

                    <h6 class="fw-bold">Farmer details</h6>

                    <p class="mb-1">
                        <strong>Farmer:</strong>
                        ${escapeHTML(listing.farmer_name || "Not provided")}
                    </p>

                    <p class="mb-1">
                        <strong>Farm:</strong>
                        ${escapeHTML(listing.farm_name || "Not provided")}
                    </p>

                    <p class="mb-1">
                        <strong>Location:</strong>
                        ${escapeHTML(listing.farmer_location || "Not provided")}
                    </p>

                    <p class="mb-0">
                        <strong>Phone:</strong>
                        ${
                            phone
                                ? `<a href="tel:${escapeHTML(phone)}">${escapeHTML(phone)}</a>`
                                : "Not provided"
                        }
                    </p>
                `;
            }

            let inquiryButton = "";

            if (isBuyer) {
                inquiryButton = `
                    <button
                        type="button"
                        class="btn btn-success w-100 mt-3 inquiry-toggle"
                        data-listing-id="${Number(listing.id)}"
                    >
                        Make an inquiry
                    </button>

                    <form
                        class="inquiry-form mt-3 d-none"
                        data-listing-id="${Number(listing.id)}"
                    >
                        <div class="mb-3">
                            <label class="form-label">
                                Quantity required
                            </label>

                            <input
                                type="number"
                                class="form-control inquiry-quantity"
                                min="0.01"
                                max="${Number(listing.quantity)}"
                                step="0.01"
                                required
                                placeholder="Enter quantity"
                            >

                            <small class="text-muted">
                                Maximum available:
                                ${escapeHTML(listing.quantity)}
                                ${escapeHTML(listing.unit)}
                            </small>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">
                                Message (optional)
                            </label>

                            <textarea
                                class="form-control inquiry-message"
                                rows="3"
                                placeholder="Write a message to the farmer..."
                            ></textarea>
                        </div>

                        <div class="inquiry-feedback"></div>

                        <button
                            type="submit"
                            class="btn btn-success w-100"
                        >
                            Submit inquiry
                        </button>
                    </form>
                `;

            } else if (!isLoggedIn) {
                inquiryButton = `
                    <a
                        href="/login/"
                        class="btn btn-outline-success w-100 mt-3"
                    >
                        Login as a buyer to inquire
                    </a>
                `;
            }

            const card = document.createElement("div");
            card.className = "col-md-6 col-lg-4";

            card.innerHTML = `
                <article class="produce-card">
                    <img
                        src="${escapeHTML(imageUrl)}"
                        alt="${escapeHTML(listing.name)}"
                        onerror="this.style.display='none'"
                    >

                    <div class="produce-card-body">

                        <span class="produce-category">
                            ${escapeHTML(listing.category_name)}
                        </span>

                        <h5 class="mt-3">
                            ${escapeHTML(listing.name)}
                        </h5>

                        <p class="produce-meta">
                            ${escapeHTML(listing.location)}
                        </p>

                        <div class="produce-price">
                            $${Number(listing.price).toFixed(2)}
                        </div>

                        <p class="produce-meta mt-2">
                            ${escapeHTML(listing.quantity)}
                            ${escapeHTML(listing.unit)}
                            available
                        </p>

                        ${farmerDetails}

                        ${inquiryButton}

                    </div>
                </article>
            `;

            produceContainer.appendChild(card);
        });

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.remove("d-none");

    } finally {
        loadingMessage.classList.add("d-none");
    }
}


// ========================================
// INQUIRY FORM
// ========================================

produceContainer.addEventListener("click", event => {
    const button = event.target.closest(".inquiry-toggle");

    if (!button) return;

    const listingId = button.dataset.listingId;

    const form = produceContainer.querySelector(
        `.inquiry-form[data-listing-id="${listingId}"]`
    );

    if (!form) return;

    form.classList.toggle("d-none");

    button.textContent = form.classList.contains("d-none")
        ? "Make an inquiry"
        : "Close inquiry form";
});


produceContainer.addEventListener("submit", async event => {
    const form = event.target.closest(".inquiry-form");

    if (!form) return;

    event.preventDefault();

    const listingId = Number(form.dataset.listingId);

    const quantityInput = form.querySelector(".inquiry-quantity");
    const messageInput = form.querySelector(".inquiry-message");
    const feedback = form.querySelector(".inquiry-feedback");
    const submitButton = form.querySelector('button[type="submit"]');

    const quantity = Number(quantityInput.value);
    const message = messageInput.value.trim();

    if (!Number.isFinite(quantity) || quantity <= 0) {
        feedback.innerHTML = `
            <div class="alert alert-danger">
                Enter a valid quantity.
            </div>
        `;
        return;
    }

    if (quantity > Number(quantityInput.max)) {
        feedback.innerHTML = `
            <div class="alert alert-danger">
                Your requested quantity exceeds the available stock.
            </div>
        `;
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    feedback.innerHTML = "";

    try {
        const accessToken = await getValidAccessToken();

        if (!accessToken) {
            window.location.href = "/login/";
            return;
        }

        const response = await fetch(INQUIRY_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                listing: listingId,
                quantity: quantity,
                message: message
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage =
                data.detail ||
                Object.values(data).flat().join(" ") ||
                "Unable to submit your inquiry.";

            throw new Error(errorMessage);
        }

        feedback.innerHTML = `
            <div class="alert alert-success">
                Your inquiry has been submitted successfully!
            </div>
        `;

        submitButton.textContent = "Inquiry submitted";

        form.querySelectorAll("input, textarea").forEach(input => {
            input.disabled = true;
        });

        const toggleButton = produceContainer.querySelector(
            `.inquiry-toggle[data-listing-id="${listingId}"]`
        );

        if (toggleButton) {
            toggleButton.textContent = "Inquiry submitted";
            toggleButton.disabled = true;
        }

    } catch (error) {
        feedback.innerHTML = `
            <div class="alert alert-danger">
                ${escapeHTML(error.message)}
            </div>
        `;

        submitButton.disabled = false;
        submitButton.textContent = "Submit inquiry";
    }
});


// ========================================
// AI PRODUCE SEARCH
// ========================================

function displayAIMatches(matches) {
    aiResults.innerHTML = "";

    if (!matches || matches.length === 0) {
        aiResults.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No matching produce was found.
                    Try changing your quantity, location or budget.
                </div>
            </div>
        `;

        return;
    }

    matches.forEach(match => {
        const card = document.createElement("div");
        card.className = "col-md-6 col-lg-4";

        const farmer = match.farmer || {};
        const phone = farmer.phone_number || "";

        const phoneLink = phone
            ? `<a href="tel:${escapeHTML(phone)}">${escapeHTML(phone)}</a>`
            : "Phone number unavailable";

        const image = match.image || "";

        const estimatedTotal = match.estimated_total !== null
            ? `
                <p class="mb-2">
                    <strong>Estimated total:</strong>
                    $${escapeHTML(match.estimated_total)}
                </p>
            `
            : "";

        card.innerHTML = `
            <article class="produce-card h-100">

                ${image ? `
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(match.produce_name)}"
                        onerror="this.style.display='none'"
                    >
                ` : ""}

                <div class="produce-card-body">

                    <span class="produce-category">
                        ${escapeHTML(match.category)}
                    </span>

                    <h5 class="mt-3">
                        ${escapeHTML(match.produce_name)}
                    </h5>

                    <p class="produce-meta">
                        ${escapeHTML(match.description)}
                    </p>

                    <div class="produce-price">
                        $${Number(match.price).toFixed(2)}
                    </div>

                    <p class="mt-2 mb-1">
                        <strong>Available:</strong>
                        ${escapeHTML(match.quantity)}
                        ${escapeHTML(match.unit_display)}
                    </p>

                    <p class="mb-2">
                        <strong>Listing location:</strong>
                        ${escapeHTML(match.listing_location)}
                    </p>

                    ${estimatedTotal}

                    <hr>

                    <h6 class="fw-bold">Farmer details</h6>

                    <p class="mb-1">
                        <strong>Name:</strong>
                        ${escapeHTML(farmer.name || "Not provided")}
                    </p>

                    <p class="mb-1">
                        <strong>Farm:</strong>
                        ${escapeHTML(farmer.farm_name || "Not provided")}
                    </p>

                    <p class="mb-1">
                        <strong>Location:</strong>
                        ${escapeHTML(farmer.location || "Not provided")}
                    </p>

                    <p class="mb-0">
                        <strong>Phone:</strong>
                        ${phoneLink}
                    </p>

                </div>
            </article>
        `;

        aiResults.appendChild(card);
    });
}


aiSearchForm.addEventListener("submit", async event => {
    event.preventDefault();

    const message = aiSearchInput.value.trim();

    if (!message) {
        aiSearchMessage.innerHTML = `
            <div class="alert alert-danger">
                Please describe the produce you need.
            </div>
        `;
        return;
    }

    aiSearchButton.disabled = true;
    aiSearchButton.textContent = "Finding matches...";

    aiSearchMessage.innerHTML = `
        <div class="text-muted">
            Understanding your request and searching available listings...
        </div>
    `;

    aiResultsSection.classList.add("d-none");
    aiResults.innerHTML = "";

    try {
        const accessToken = await getValidAccessToken();

        if (!accessToken) {
            window.location.href = "/login/";
            return;
        }

        const response = await fetch(AI_SEARCH_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                message: message
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Unable to complete your AI search."
            );
        }

        aiSearchMessage.innerHTML = `
            <div class="alert alert-success">
                ${escapeHTML(data.message)}
            </div>
        `;

        displayAIMatches(data.matches);

        aiResultsSection.classList.remove("d-none");

    } catch (error) {
        aiSearchMessage.innerHTML = `
            <div class="alert alert-danger">
                ${escapeHTML(error.message)}
            </div>
        `;

    } finally {
        aiSearchButton.disabled = false;
        aiSearchButton.textContent = "Find matching farmers";
    }
});


// ========================================
// SEARCH AND FILTER EVENTS
// ========================================

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadProduce, 400);
});

categoryFilter.addEventListener("change", loadProduce);
orderingFilter.addEventListener("change", loadProduce);


// ========================================
// INITIALIZE MARKETPLACE
// ========================================

async function initializeMarketplace() {
    const currentUser = getCurrentUser();

    if (currentUser?.role === "BUYER") {
        aiSearchSection.classList.remove("d-none");
    }

    await loadCategories();
    await loadProduce();
}

initializeMarketplace();
