package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
)

func main() {
	apiTarget := getenv("API_URL", "http://api:8080")
	recTarget := getenv("RECOMMEND_URL", "http://recommendation:8080")
	authTarget := getenv("AUTH_URL", "http://auth:8080")
	lawTarget := getenv("LAW_URL", "http://law:8080")
	listen := getenv("GATEWAY_PORT", "8000")

	apiProxy := mustProxy(apiTarget)
	recProxy := mustProxy(recTarget)
	authProxy := mustProxy(authTarget)
	lawProxy := mustProxy(lawTarget)

	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mux.HandleFunc("/api/v1/query/recommend", func(w http.ResponseWriter, r *http.Request) {
		recProxy.ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/v1/auth/", func(w http.ResponseWriter, r *http.Request) {
		authProxy.ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/v1/law/", func(w http.ResponseWriter, r *http.Request) {
		lawProxy.ServeHTTP(w, r)
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Fallback route all other paths to main API service
		apiProxy.ServeHTTP(w, r)
	})

	log.Printf("gateway listening on :%s -> api=%s recommend=%s auth=%s law=%s", listen, apiTarget, recTarget, authTarget, lawTarget)
	if err := http.ListenAndServe(":"+listen, mux); err != nil {
		log.Fatalf("gateway listen: %v", err)
	}
}

func mustProxy(target string) *httputil.ReverseProxy {
	u, err := url.Parse(target)
	if err != nil {
		log.Fatalf("invalid proxy target %s: %v", target, err)
	}
	proxy := httputil.NewSingleHostReverseProxy(u)
	proxy.Director = func(req *http.Request) {
		req.URL.Scheme = u.Scheme
		req.URL.Host = u.Host
		req.Host = u.Host
		if !strings.HasPrefix(req.URL.Path, "/") {
			req.URL.Path = "/" + req.URL.Path
		}
	}
	return proxy
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
