package auth

import (
	"context"
	"log"
	"os"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// SeedAdmin ensures an admin account exists
func SeedAdmin(ctx context.Context, repo Repository) error {
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@example.com"
	}
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin"
	}

	// Check if admin exists
	_, err := repo.GetUserByEmail(ctx, adminEmail)
	if err == nil {
		log.Println("Admin account already exists.")
		return nil
	}

	log.Println("Seeding admin account...")
	hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := User{
		ID:           uuid.New(),
		Email:        adminEmail,
		Name:         "Administrator",
		PasswordHash: string(hash),
		Role:         "admin",
	}

	// We use repo directly to avoid token generation overhead of Service.Register
	// Also Service.Register forces role="user" currently.
	// So we manually create here or update Service to allow role selection?
	// Repo.CreateUser takes a user object with role, so we can set it there.

	if err := repo.CreateUser(ctx, &user); err != nil {
		return err
	}
	log.Printf("Admin account created: %s / %s", adminEmail, adminPassword)
	return nil
}
