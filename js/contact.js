
// =====================================================
// PERRYHUB CONTACT FORM
// SUPABASE
// =====================================================

const SUPABASE_URL = "https://htxjxjgwecklicurpdtw.supabase.co";

const SUPABASE_KEY = "sb_publishable_2y48kCZHxaHeTFvSLiO9mw_Vu233CcT";


// Create Supabase client
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// Get form
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const contactSubmit = document.getElementById("contactSubmit");


if (contactForm) {

    contactForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const subject = document.getElementById("subject").value.trim();
        const message = document.getElementById("message").value.trim();


        if (!name || !email || !subject || !message) {

            formStatus.textContent = "Please complete all fields.";
            formStatus.className = "form-status error";

            return;
        }


        if (contactSubmit) {
            contactSubmit.disabled = true;
            contactSubmit.textContent = "Sending...";
        }


        formStatus.textContent = "Sending...";
        formStatus.className = "form-status";


        try {

            console.log("PerryHub: Sending message to Supabase...");


            const { error } = await supabaseClient
                .from("contact_messages")
                .insert([
                    {
                        name: name,
                        email: email,
                        subject: subject,
                        message: message
                    }
                ]);


            if (error) {
                console.error("Supabase error:", error);
                throw error;
            }


            console.log("PerryHub: Message successfully saved.");


            formStatus.textContent =
                "Message sent successfully. Thanks for reaching out!";

            formStatus.className =
                "form-status success";


            contactForm.reset();


        } catch (error) {

            console.error(
                "PerryHub contact form error:",
                error
            );


            formStatus.textContent =
                "Something went wrong. Please try again later.";

            formStatus.className =
                "form-status error";

        } finally {

            if (contactSubmit) {
                contactSubmit.disabled = false;
                contactSubmit.textContent = "Send Message";
            }

        }

    });

}
