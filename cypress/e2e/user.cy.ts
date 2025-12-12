it("user", function() {
     cy.visit("localhost:3000")

     cy.contains("button", "Sign Up").click();
     cy.get("#email").type("test@test.test");
     cy.get("#username").type("test");
     cy.get("#password").type("test123");
     cy.get("#confirm-password").type("test123");
     cy.contains("button", "Create Account").click();
     
     cy.wait(2000);

     cy.get("#username").type("test");
     cy.get("#password").type("test123");
     cy.get("form").contains("button", "Log In").click();

     cy.url().should("include", "/dashboard");

     cy.get("div[data-sidebar=\"footer\"]").find("button").click();
     cy.contains("span", "Logout").click();
     cy.contains("button", "Logout").click();

     cy.get("#username").type("test");
     cy.get("#password").type("test123");
     cy.get("form").contains("button", "Log In").click();

     cy.url().should("include", "/dashboard");

     cy.get("div[data-sidebar=\"footer\"]").find("button").click();
     cy.contains("span", "Delete Account").click();
     cy.get("#confirm").type("DELETE");
     cy.contains("button", "Delete Account").click();

     cy.get("#username").type("test");
     cy.get("#password").type("test123");
     cy.get("form").contains("button", "Log In").click();

     cy.url().should("include", "/register");
});