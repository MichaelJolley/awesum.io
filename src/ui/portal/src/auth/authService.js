import Vue from "vue";
import createAuth0Client from "@auth0/auth0-spa-js";
import store from "../state/Store";

const DEFAULT_REDIRECT_CALLBACK = () =>
  window.history.replaceState({}, document.title, window.location.pathname);

let instance;

export const getInstance = () => instance;

export const createAuthService = ({
  onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
  redirect_uri = window.location.origin,
  ...options
}) => {
  if (instance) return instance;

  instance = new Vue({
    store,
    data() {
      return {
        loading: true,
        isAuthenticated: false,
        user: {},
        auth0Client: null,
        popupOpen: false,
        error: null
      };
    },
    async created() {
      this.auth0Client = await createAuth0Client({
        domain: options.domain,
        client_id: options.clientId,
        audience: options.audience,
        redirect_uri
      });

      try {
        if (
          window.location.search.includes("code=") &&
          window.location.search.includes("state=")
        ) {
          const { appState } = await this.auth0Client.handleRedirectCallback();
          onRedirectCallback(appState);
        }
      } catch (e) {
        this.error = e;
      } finally {
        this.isAuthenticated = await this.auth0Client.isAuthenticated();
        this.user = await this.auth0Client.getUser();
        if (this.isAuthenticated) {
          this.$store.dispatch("login", this.user).then(() => {
            this.$store.dispatch("loaded");
          });
        }
        this.loading = false;
      }
    },
    methods: {
      async loginWithPopup(o) {
        this.popupOpen = true;

        try {
          await this.auth0Client.loginWithPopup(o);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        } finally {
          this.popupOpen = false;
        }
        this.user = await this.auth0Client.getUser();
        this.isAuthenticated = true;

        this.$store.dispatch("login", this.user).then(() => {
          this.$store.dispatch("loaded");
        });
      },
      async handleRedirectCallback() {
        this.loading = true;
        try {
          await this.auth0Client.handleRedirectCallback();
          this.user = await this.auth0Client.getUser();
          this.isAuthenticated = true;
          this.$store.dispatch("login", this.user).then(() => {
            this.$store.dispatch("loaded");
          });
        } catch (e) {
          this.error = e;
        } finally {
          this.loading = false;
        }
      },
      loginWithRedirect(o) {
        return this.auth0Client.loginWithRedirect(o);
      },
      getIdTokenClaims(o) {
        return this.auth0Client.getIdTokenClaims(o);
      },
      hasTokenClaim(claimName) {
        if (this.user) {
          const roles = this.user[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
          return roles && roles.includes(claimName);
        }

        return false;
      },
      getTokenSilently(o) {
        return this.auth0Client.getTokenSilently(o);
      },
      getTokenWithPopup(o) {
        return this.auth0Client.getTokenWithPopup(o);
      },
      logout(o) {
        return this.auth0Client.logout(o);
      }
    }
  });

  return instance;
};
