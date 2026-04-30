
    function submitHubSpot() {
      var firstname = document.getElementById("hs-firstname").value.trim();
      var email = document.getElementById("hs-email").value.trim();
      var interest = document.getElementById("hs-interest").value;
      var commission = document.getElementById("hs-commission") ? document.getElementById("hs-commission").value.trim() : "";
      var consent = document.getElementById("hs-consent").checked;
      var dataConsent = document.getElementById("hs-data-consent").checked;
      var err = document.getElementById("hs-error");
      err.style.display = "none";
      if (!firstname) { err.textContent = "Please enter your first name."; err.style.display = "block"; return; }
      if (!email || !email.includes("@")) { err.textContent = "Please enter a valid email address."; err.style.display = "block"; return; }
      if (!consent) { err.textContent = "Please tick the consent checkbox to continue."; err.style.display = "block"; return; }
      if (!dataConsent) { err.textContent = "Please tick the data processing checkbox to continue."; err.style.display = "block"; return; }
      var portalId = "48019771";
      var formId = "4f756474-958a-4de1-92d6-643e10652eae";
      var url = "https://api.hsforms.com/submissions/v3/integration/submit/" + portalId + "/" + formId;
      var data = {
        fields: [
          { name: "firstname", value: firstname },
          { name: "email", value: email },
          { name: "product_interest", value: interest },
          { name: "message", value: commission ? "Commission request: " + commission : "" }
        ],
        context: { pageUri: window.location.href, pageName: "SpeckyTec Homepage" },
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: "I agree to allow SpeckyTec to store and process my personal data.",
            communications: [{
              value: true,
              subscriptionTypeId: 999,
              text: "I agree to receive the free weekly SpeckyTec newsletter."
            }]
          }
        }
      };
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      .then(function(r) {
        if (r.ok) {
          document.getElementById("hs-custom-form").style.display = "none";
          document.getElementById("hs-success").style.display = "block";
        } else {
          return r.json().then(function(e) { throw e; });
        }
      })
      .catch(function(e) {
        var msg = "Something went wrong. Please try again or email hello@speckytec.com";
        if(e && e.errors && e.errors[0]) { msg = e.errors[0].message; }
        err.textContent = msg;
        err.style.display = "block";
        console.error("HubSpot error:", e);
      });
    }
    