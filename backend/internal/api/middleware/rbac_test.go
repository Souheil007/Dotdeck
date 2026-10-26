// Package middleware provides unit tests validating authentication and role authorization logic.
package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type mockRoleResolver struct {
	assignedRole Role
	shouldFail   bool
}

func (resolver *mockRoleResolver) ResolveRole(requestContext context.Context, workspaceID, userID string) (Role, error) {
	if resolver.shouldFail {
		return "", errors.New("database lookup error")
	}
	return resolver.assignedRole, nil
}

func dummySuccessHandler() http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte(`{"status":"ok"}`))
	})
}

// TestRBAC_HierarchyEnforcement tests that role weights strictly protect higher tier routes.
func TestRBAC_HierarchyEnforcement(testingTarget *testing.T) {
	testCases := []struct {
		name         string
		userRole     Role
		requiredRole Role
		expectedCode int
	}{
		{
			name:         "Admin accessing Admin route should succeed",
			userRole:     RoleAdmin,
			requiredRole: RoleAdmin,
			expectedCode: http.StatusOK,
		},
		{
			name:         "Admin accessing Write route should succeed",
			userRole:     RoleAdmin,
			requiredRole: RoleWrite,
			expectedCode: http.StatusOK,
		},
		{
			name:         "Operator accessing Write route should succeed",
			userRole:     RoleWrite,
			requiredRole: RoleWrite,
			expectedCode: http.StatusOK,
		},
		{
			name:         "Operator accessing Admin route should be forbidden",
			userRole:     RoleWrite,
			requiredRole: RoleAdmin,
			expectedCode: http.StatusForbidden,
		},
		{
			name:         "Observer accessing Write route should be forbidden (DoD 1)",
			userRole:     RoleRead,
			requiredRole: RoleWrite,
			expectedCode: http.StatusForbidden,
		},
		{
			name:         "Observer accessing Admin route should be forbidden",
			userRole:     RoleRead,
			requiredRole: RoleAdmin,
			expectedCode: http.StatusForbidden,
		},
	}

	for _, testCase := range testCases {
		testingTarget.Run(testCase.name, func(subTest *testing.T) {
			middlewareHandler := RequireRole(nil, testCase.requiredRole)(dummySuccessHandler())

			httpRequest := httptest.NewRequest(http.MethodPost, "/test", nil)
			httpRequest.Header.Set("X-User-Role", string(testCase.userRole))

			// Run through Authenticate first so X-User-Role is populated
			authenticatedHandler := Authenticate(middlewareHandler)

			recorder := httptest.NewRecorder()
			authenticatedHandler.ServeHTTP(recorder, httpRequest)

			if recorder.Code != testCase.expectedCode {
				subTest.Fatalf("expected HTTP status %d, got %d (body: %s)", testCase.expectedCode, recorder.Code, recorder.Body.String())
			}
		})
	}
}

// TestRBAC_DynamicResolver validates that a custom resolver dynamically updates role checks.
func TestRBAC_DynamicResolver(testingTarget *testing.T) {
	resolver := &mockRoleResolver{assignedRole: RoleWrite}
	middlewareHandler := RequireRole(resolver, RoleWrite)(dummySuccessHandler())

	httpRequest := httptest.NewRequest(http.MethodPost, "/test?workspace_id=ws-123", nil)
	httpRequest.Header.Set("X-User-ID", "operator-99")
	authenticatedHandler := Authenticate(middlewareHandler)

	recorder := httptest.NewRecorder()
	authenticatedHandler.ServeHTTP(recorder, httpRequest)

	if recorder.Code != http.StatusOK {
		testingTarget.Fatalf("expected HTTP 200, got %d", recorder.Code)
	}

	// Test resolver failure
	failingResolver := &mockRoleResolver{shouldFail: true}
	failingMiddleware := RequireRole(failingResolver, RoleWrite)(dummySuccessHandler())
	failingHandler := Authenticate(failingMiddleware)

	failingRecorder := httptest.NewRecorder()
	failingHandler.ServeHTTP(failingRecorder, httpRequest)

	if failingRecorder.Code != http.StatusForbidden {
		testingTarget.Fatalf("expected HTTP 403 on resolver failure, got %d", failingRecorder.Code)
	}
}
