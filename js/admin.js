// =====================================================
// PERRYHUB ADMIN DASHBOARD
// =====================================================

const PERRYHUB_API = "http://127.0.0.1:8000";


// =====================================================
// DOM ELEMENTS
// =====================================================

const adminConnectionStatus =
    document.getElementById("adminConnectionStatus");

const logoutButton =
    document.getElementById("logoutButton");

const logoutAllSessions =
    document.getElementById("logoutAllSessions");

const refreshDashboard =
    document.getElementById("refreshDashboard");

const messageCount =
    document.getElementById("messageCount");

const sidebarMessageCount =
    document.getElementById("sidebarMessageCount");

const apiStatus =
    document.getElementById("apiStatus");

const authStatus =
    document.getElementById("authStatus");

const securityStatus =
    document.getElementById("securityStatus");

const messagesContainer =
    document.getElementById("messagesContainer");

const messageStatus =
    document.getElementById("messageStatus");

const securityLogs =
    document.getElementById("securityLogs");


// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(
        `${PERRYHUB_API}${endpoint}`,
        {
            ...options,

            credentials: "include",

            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        }
    );


    const text = await response.text();

    let data = {};

    try {

        data = text
            ? JSON.parse(text)
            : {};

    } catch {

        data = {};

    }


    console.log(
        `PerryHub API ${endpoint}:`,
        response.status,
        data
    );


    if (response.status === 401) {

        throw new Error(
            "Administrator authentication required."
        );

    }


    if (!response.ok) {

        throw new Error(
            data.detail ||
            data.message ||
            `Server returned HTTP ${response.status}`
        );

    }


    return data;

}


// =====================================================
// CHECK ADMIN SESSION
// =====================================================

async function checkAdminSession() {

    try {

        const data =
            await apiRequest(
                "/api/admin/me"
            );


        console.log(
            "PerryHub session authenticated:",
            data
        );


        if (authStatus) {

            authStatus.textContent =
                "Authenticated";

        }


        return true;

    } catch (error) {

        console.error(
            "PerryHub session check failed:",
            error
        );


        if (authStatus) {

            authStatus.textContent =
                "Not Authenticated";

        }


        return false;

    }

}


// =====================================================
// LOAD MESSAGES
// =====================================================

async function loadMessages() {

    console.log(
        "PerryHub: Loading messages..."
    );


    if (messageStatus) {

        messageStatus.textContent =
            "Loading messages...";

    }


    try {

        const data =
            await apiRequest(
                "/api/messages"
            );


        const messages =
            data.messages || [];


        console.log(
            "PerryHub: Messages received:",
            messages.length
        );


        // -----------------------------
        // Update counters
        // -----------------------------

        if (messageCount) {

            messageCount.textContent =
                messages.length;

        }


        if (sidebarMessageCount) {

            sidebarMessageCount.textContent =
                messages.length;

        }


        // -----------------------------
        // Check container
        // -----------------------------

        if (!messagesContainer) {

            console.error(
                "PerryHub: messagesContainer not found."
            );

            return;

        }


        // -----------------------------
        // Empty state
        // -----------------------------

        if (messages.length === 0) {

            messagesContainer.innerHTML = `
                <div class="empty-state">

                    <h3>
                        No messages yet
                    </h3>

                    <p>
                        Messages submitted through
                        the Contact page will appear here.
                    </p>

                </div>
            `;


            if (messageStatus) {

                messageStatus.textContent =
                    "No messages";

            }


            return;

        }


        // -----------------------------
        // Render messages
        // -----------------------------

        messagesContainer.innerHTML =
            messages.map(
                function (message) {

                    return `
                        <article class="message-card">

                            <div class="message-card-header">

                                <div>

                                    <h3>
                                        ${escapeHTML(
                                            message.subject
                                        )}
                                    </h3>

                                    <p class="message-sender">
                                        From:
                                        ${escapeHTML(
                                            message.name
                                        )}
                                    </p>

                                </div>

                                <time>
                                    ${formatDate(
                                        message.created_at
                                    )}
                                </time>

                            </div>


                            <div class="message-email">

                                <strong>
                                    Email:
                                </strong>

                                <a
                                    href="mailto:${escapeHTML(
                                        message.email
                                    )}"
                                >
                                    ${escapeHTML(
                                        message.email
                                    )}
                                </a>

                            </div>


                            <div class="message-content">

                                ${escapeHTML(
                                    message.message
                                )}

                            </div>

                        </article>
                    `;

                }
            ).join("");


        if (messageStatus) {

            messageStatus.textContent =
                `${messages.length} ${
                    messages.length === 1
                        ? "message"
                        : "messages"
                }`;

        }


        console.log(
            "PerryHub: Messages rendered successfully."
        );

    } catch (error) {

        console.error(
            "PerryHub admin error:",
            error
        );


        if (messagesContainer) {

            messagesContainer.innerHTML = `
                <div class="error-state">

                    <h3>
                        Unable to load messages
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>
            `;

        }


        if (messageStatus) {

            messageStatus.textContent =
                "Error loading messages";

        }

    }

}


// =====================================================
// LOAD SECURITY LOGS
// =====================================================

async function loadSecurityLogs() {

    if (!securityLogs) {

        return;

    }


    try {

        const data =
            await apiRequest(
                "/api/admin/logs"
            );


        const logs =
            data.logs || [];


        if (logs.length === 0) {

            securityLogs.innerHTML = `
                <div class="empty-state">

                    No security activity recorded.

                </div>
            `;

            return;

        }


        securityLogs.innerHTML =
            logs.map(
                function (log) {

                    return `
                        <div class="security-log">

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        log.event
                                    )}
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        log.details || ""
                                    )}
                                </p>

                            </div>

                            <time>
                                ${formatDate(
                                    log.created_at
                                )}
                            </time>

                        </div>
                    `;

                }
            ).join("");


    } catch (error) {

        console.error(
            "PerryHub security logs error:",
            error
        );


        securityLogs.innerHTML = `
            <div class="error-state">

                Unable to load security activity.

            </div>
        `;

    }

}


// =====================================================
// LOAD SECURITY STATUS
// =====================================================

async function loadSecurityStatus() {

    console.log(
        "PerryHub: Loading security status..."
    );


    try {

        const data =
            await apiRequest(
                "/api/admin/security-status"
            );


        const security =
            data.security || {};


        // -----------------------------
        // Authentication
        // -----------------------------

        const authenticationIndicator =
            document.getElementById(
                "authenticationIndicator"
            );


        if (authenticationIndicator) {

            authenticationIndicator.textContent =
                security.authentication?.status ||
                "Unknown";

        }


        // -----------------------------
        // Rate Limiting
        // -----------------------------

        const rateLimitIndicator =
            document.getElementById(
                "rateLimitIndicator"
            );


        if (rateLimitIndicator) {

            rateLimitIndicator.textContent =
                security.rate_limiting?.status ||
                "Unknown";

        }


        // -----------------------------
        // CORS
        // -----------------------------

        const corsIndicator =
            document.getElementById(
                "corsIndicator"
            );


        if (corsIndicator) {

            corsIndicator.textContent =
                security.cors?.status ||
                "Unknown";

        }


        // -----------------------------
        // Security Headers
        // -----------------------------

        const headersIndicator =
            document.getElementById(
                "headersIndicator"
            );


        if (headersIndicator) {

            headersIndicator.textContent =
                security.security_headers?.status ||
                "Unknown";

        }


        console.log(
            "PerryHub: Security status loaded:",
            security
        );


    } catch (error) {

        console.error(
            "PerryHub security status error:",
            error
        );


        const indicators = [

            "authenticationIndicator",

            "rateLimitIndicator",

            "corsIndicator",

            "headersIndicator"

        ];


        indicators.forEach(
            function (id) {

                const element =
                    document.getElementById(id);


                if (element) {

                    element.textContent =
                        "Unavailable";

                }

            }
        );

    }

}


// =====================================================
// LOAD DASHBOARD
// =====================================================

async function loadDashboard() {

    console.log(
        "PerryHub: Loading admin dashboard..."
    );


    try {

        if (adminConnectionStatus) {

            adminConnectionStatus.textContent =
                "Connecting...";

        }


        // -----------------------------
        // Verify authentication
        // -----------------------------

        const authenticated =
            await checkAdminSession();


        if (!authenticated) {

            console.error(
                "PerryHub: Administrator is not authenticated."
            );

            if (adminConnectionStatus) {

                adminConnectionStatus.textContent =
                    "Authentication Required";

            }

            return;

        }


        // -----------------------------
        // Update status
        // -----------------------------

        if (apiStatus) {

            apiStatus.textContent =
                "Online";

        }


        if (securityStatus) {

            securityStatus.textContent =
                "Protected";

        }


        if (adminConnectionStatus) {

            adminConnectionStatus.textContent =
                "Connected";

        }


        // -----------------------------
        // Load data
        // -----------------------------

        await loadMessages();

        await loadSecurityLogs();

        await loadSecurityStatus();


        console.log(
            "PerryHub: Admin dashboard loaded."
        );


    } catch (error) {

        console.error(
            "PerryHub dashboard error:",
            error
        );


        if (adminConnectionStatus) {

            adminConnectionStatus.textContent =
                "Connection Error";

        }

    }

}


// =====================================================
// LOGOUT
// =====================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            logoutButton.disabled =
                true;


            logoutButton.textContent =
                "Logging out...";


            try {

                await fetch(
                    `${PERRYHUB_API}/api/admin/logout`,
                    {
                        method: "POST",

                        credentials: "include"
                    }
                );

            } catch (error) {

                console.error(
                    "PerryHub logout error:",
                    error
                );

            }


            window.location.href =
                "admin-login.html";

        }
    );

}


// =====================================================
// LOGOUT ALL ADMIN SESSIONS
// =====================================================

if (logoutAllSessions) {

    logoutAllSessions.addEventListener(
        "click",
        async function () {

            const confirmed =
                confirm(
                    "Are you sure you want to log out all administrator sessions?"
                );


            if (!confirmed) {

                return;

            }


            logoutAllSessions.disabled =
                true;


            logoutAllSessions.textContent =
                "Logging out...";


            try {

                const data =
                    await apiRequest(
                        "/api/admin/logout-all",
                        {
                            method: "POST"
                        }
                    );


                console.log(
                    "PerryHub: All sessions invalidated:",
                    data
                );


                alert(
                    data.message ||
                    "All administrator sessions have been logged out."
                );


                window.location.href =
                    "admin-login.html";


            } catch (error) {

                console.error(
                    "PerryHub logout-all error:",
                    error
                );


                alert(
                    "Unable to log out all sessions.\n\n" +
                    error.message
                );


                logoutAllSessions.disabled =
                    false;


                logoutAllSessions.textContent =
                    "Logout All Sessions";

            }

        }
    );

}


// =====================================================
// REFRESH DASHBOARD
// =====================================================

if (refreshDashboard) {

    refreshDashboard.addEventListener(
        "click",
        function () {

            loadDashboard();

        }
    );

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(value) {

    if (!value) {

        return "";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleString();

}


// =====================================================
// START
// =====================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        loadDashboard
    );

} else {

    loadDashboard();

}