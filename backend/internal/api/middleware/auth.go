// Package middleware provides HTTP middleware for authentication, RBAC authorization,
// and request context population.
package middleware

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const (
	// UserIDKey identifies the authenticated user in the request context.
	UserIDKey contextKey = "user_id"

	// UserNameKey identifies the user's display name.
	UserNameKey contextKey = "user_name"

	// UserRoleKey identifies the user's role in the current workspace.
	UserRoleKey contextKey = "user_role"
)

// Authenticate extracts session headers or tokens and attaches user identity to the context.
//
// In development, it falls back to a default developer profile if no header is present.
func Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		userID := request.Header.Get("X-User-ID")
		userName := request.Header.Get("X-User-Name")

		if userID == "" {
			// Development default fallback
			userID = "dev-operator"
			userName = "Alex Dev"
		}

		ctx := context.WithValue(request.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserNameKey, userName)
		next.ServeHTTP(writer, request.WithContext(ctx))
	})
}

// GetUserID retrieves the authenticated operator identifier from the context.
func GetUserID(ctx context.Context) string {
	if val, ok := ctx.Value(UserIDKey).(string); ok {
		return val
	}
	return ""
}

// GetUserName retrieves the authenticated operator display name from the context.
func GetUserName(ctx context.Context) string {
	if val, ok := ctx.Value(UserNameKey).(string); ok {
		return val
	}
	return ""
}

// WithUserContext injects operator credentials into a request context.
func WithUserContext(parentContext context.Context, userID, userName, userRole string) context.Context {
	userContext := context.WithValue(parentContext, UserIDKey, userID)
	userContext = context.WithValue(userContext, UserNameKey, userName)
	return context.WithValue(userContext, UserRoleKey, userRole)
}

// BearerToken extracts the token component from an Authorization header.
func BearerToken(request *http.Request) string {
	header := request.Header.Get("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		return strings.TrimPrefix(header, "Bearer ")
	}
	return ""
}
