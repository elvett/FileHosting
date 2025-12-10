describe("File and Folder Operations", () => {
  const FOLDER_ENDPOINT = "/api/folders/removeFolder/*";

  beforeEach(() => {
    cy.intercept("DELETE", FOLDER_ENDPOINT).as("removeFolder");

    cy.visit("localhost:3000");
    cy.get("#username").type("test123");
    cy.get("#password").type("test123");
    cy.get("button.w-full").click();
    cy.url().should("include", "/dashboard");
  });

  it("Crearte Find Delete folder", () => {
    const folderName = `Folder_to_Delete_${Date.now()}`;

    cy.contains("span", "New").click();
    cy.contains("span", "Create Folder").click();

    cy.get('input[placeholder="Folder name"]')
      .should("be.visible")
      .type(folderName);

    cy.contains("button", "Create").click();
    cy.get('input[placeholder="Folder name"]', { timeout: 10000 }).should(
      "not.exist",
    );

    cy.get("html.dark").click();
    cy.contains("span", "New").click();
    cy.contains("a", folderName).should("be.visible");
    cy.contains("a", folderName)
      .parents("tr")
      .within(() => {
        cy.get('button[data-slot="dropdown-menu-trigger"]').click();
      });

    cy.contains('div[role="menuitem"]', "Delete").click();

    cy.wait("@removeFolder");
  });
});
