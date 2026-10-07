
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

                    entry.target.style.transform =
                        "translateY(0)";

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

        element.style.transform =
            "translateY(25px)";

        element.style.transition =
            "opacity 0.6s ease, transform 0.6s ease";

        revealObserver.observe(element);

    });

}
