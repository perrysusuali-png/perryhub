
// =====================================================
// PERRYHUB
// Main JavaScript
// =====================================================


// ================= MOBILE MENU =================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("open");
    });


    // Close mobile menu after clicking a link

    navLinks.querySelectorAll("a").forEach((link) => {

        link.addEventListener("click", () => {
            navLinks.classList.remove("open");
        });

    });

}


// ================= YEAR =================

const year = document.getElementById("year");

if (year) {
    year.textContent = new Date().getFullYear();
}


// ================= PROFILE IMAGE =================

const profileImage = document.getElementById("profileImage");
const profilePlaceholder = document.getElementById("profilePlaceholder");

if (profileImage) {

    profileImage.addEventListener("load", () => {

        profileImage.style.display = "block";

        if (profilePlaceholder) {
            profilePlaceholder.style.display = "none";
        }

    });


    profileImage.addEventListener("error", () => {

        profileImage.style.display = "none";

        if (profilePlaceholder) {
            profilePlaceholder.style.display = "flex";
        }

    });

}


// ================= SCROLL REVEAL =================

const revealElements = document.querySelectorAll(
    ".service-card, .project-card, .about-card, .research-box"
);

if (revealElements.length > 0) {

    const revealObserver = new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.style.opacity = "1";
                    entry.target.style.transform = "translateY(0)";

                    revealObserver.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.12
        }
    );


    revealElements.forEach((element) => {

        element.style.opacity = "0";
        element.style.transform = "translateY(25px)";
        element.style.transition =
            "opacity 0.6s ease, transform 0.6s ease";

        revealObserver.observe(element);

    });

}


// ==========================================
// PERRYHUB API
// ==========================================

const PERRYHUB_API = "http://127.0.0.1:8000";


async function checkPerryHubAPI() {

    try {

        const response = await fetch(
            `${PERRYHUB_API}/api/health`
        );


        if (!response.ok) {

            throw new Error(
                "API request failed"
            );

        }


        const data = await response.json();


        console.log(
            "PerryHub API:",
            data
        );


        return data;


    } catch (error) {

        console.error(
            "PerryHub API connection failed:",
            error
        );


        return null;

    }

}


// ==========================================
// PERRYHUB CONTACT FORM
// ==========================================

const contactForm = document.getElementById("contactForm");


if (contactForm) {

    contactForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            console.log(
                "PerryHub: Contact form submitted."
            );


            // ==========================================
            // GET FORM DATA
            // ==========================================

            const formData = new FormData(
                contactForm
            );


            const name = formData.get("name");
            const email = formData.get("email");
            const subject = formData.get("subject");
            const message = formData.get("message");


            console.log(
                "PerryHub: Form data collected.",
                {
                    name: name,
                    email: email,
                    subject: subject,
                    message: message
                }
            );


            // ==========================================
            // VALIDATION
            // ==========================================

            if (
                !name ||
                !email ||
                !subject ||
                !message
            ) {

                alert(
                    "Please complete all fields."
                );

                return;

            }


            // ==========================================
            // GET SUBMIT BUTTON
            // ==========================================

            const submitButton =
                contactForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.textContent =
                    "Sending...";

            }


            // ==========================================
            // SEND REQUEST
            // ==========================================

            try {

                console.log(
                    "PerryHub: Sending request to:",
                    `${PERRYHUB_API}/api/contact`
                );


                const response = await fetch(
                    `${PERRYHUB_API}/api/contact`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({

                            name: name.trim(),

                            email: email.trim(),

                            subject: subject.trim(),

                            message: message.trim()

                        })

                    }
                );


                console.log(
                    "PerryHub: Response status:",
                    response.status
                );


                // ==========================================
                // READ RESPONSE
                // ==========================================

                const data =
                    await response.json();


                console.log(
                    "PerryHub: API response:",
                    data
                );


                // ==========================================
                // API ERROR
                // ==========================================

                if (!response.ok) {

                    throw new Error(

                        data.detail ||
                        data.message ||
                        `Server returned HTTP ${response.status}`

                    );

                }


                // ==========================================
                // SUCCESS
                // ==========================================

                alert(

                    data.message ||
                    "Your message has been received."

                );


                contactForm.reset();


                console.log(
                    "PerryHub: Message successfully saved."
                );


            } catch (error) {

                console.error(
                    "PerryHub: Contact form error:",
                    error
                );


                alert(

                    "Unable to send your message.\n\n" +
                    error.message

                );


            } finally {

                // ==========================================
                // RESTORE BUTTON
                // ==========================================

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.textContent =
                        "Send Message";

                }

            }

        }
    );

}
