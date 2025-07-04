package main

import (
	"fmt"
	"net/http"
	"os"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gopkg.in/gomail.v2"
)

type ContactForm struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Phone string `json:"phone" binding:"required"`
}

func sendEmail(form ContactForm) error {
	emailUser := os.Getenv("EMAIL_USERNAME")
	emailPass := os.Getenv("EMAIL_PASSWORD")

	if emailUser == "" {
		emailUser = "your@gmail.com"
		emailPass = "your-app-password"
	}

	d := gomail.NewDialer("smtp.gmail.com", 587, emailUser, emailPass)

	m1 := gomail.NewMessage()
	m1.SetHeader("From", emailUser)
	m1.SetHeader("To", emailUser)
	m1.SetHeader("Subject", "📬 New Contact Form Submission!")

	m1.SetBody("text/html", fmt.Sprintf(`
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #1976D2;">📥 New Contact Request</h2>
    <p>You have received a new message from your website contact form.</p>

    <table style="width: 100%%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; font-weight: bold;">👤 Name:</td>
        <td style="padding: 8px;">%s</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">📧 Email:</td>
        <td style="padding: 8px;">%s</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">📱 Phone:</td>
        <td style="padding: 8px;">%s</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">🕒 Submitted At:</td>
        <td style="padding: 8px;">%s</td>
      </tr>
    </table>

    <p style="margin-top: 20px;">🚀 Please follow up as soon as possible.</p>
    <p style="color: #888;">Website Bot • Do not reply</p>
  </div>
`, form.Name, form.Email, form.Phone, time.Now().Format("02 Jan 2006 15:04 MST")))

	// Confirmation email TO USER
	m2 := gomail.NewMessage()
	m2.SetHeader("From", emailUser)
	m2.SetHeader("To", form.Email)
	m2.SetHeader("Subject", "✅ We Received Your Message!")

	m2.SetBody("text/html", fmt.Sprintf(`
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
    <h2 style="color: #4CAF50;">🙌 Thank You, %s!</h2>
    <p>We’ve received your message and will get back to you soon.</p>

    <h4 style="margin-top: 30px;">📋 Here's what you sent:</h4>
    <ul style="line-height: 1.8;">
      <li><strong>Name:</strong> %s</li>
      <li><strong>Email:</strong> %s</li>
      <li><strong>Phone:</strong> %s</li>
    </ul>

    <p style="margin-top: 30px;">In the meantime, feel free to explore our website or reply to this email if you have urgent questions.</p>

    <p style="margin-top: 20px;">Warm regards,<br/><strong>Your Company Team 💙</strong></p>
  </div>
`, form.Name, form.Name, form.Email, form.Phone))

	// Send both emails
	if err := d.DialAndSend(m1, m2); err != nil {
		return err
	}

	return nil
}

func main() {
	// Load environment variables from .env
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️ No .env file found. (Okay in production)")
	}

	router := gin.Default()

	// CORS: allow frontend (e.g. Nuxt) to send requests
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// POST /contact endpoint
	router.POST("/contact", func(c *gin.Context) {
		var form ContactForm

		if err := c.ShouldBindJSON(&form); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validate phone number format
		if matched, _ := regexp.MatchString(`^\d{10,15}$`, form.Phone); !matched {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid phone number format"})
			return
		}

		// Send the email
		if err := sendEmail(form); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Message received! Email sent ✅"})
	})

	// Start the server
	router.Run(":8080")
}
