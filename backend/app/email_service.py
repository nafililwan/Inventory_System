import smtplib
import os
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from dotenv import load_dotenv

# Load .env file from backend directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class EmailService:
    def __init__(self):
        # Load .env again to ensure it's loaded
        env_path = Path(__file__).parent.parent / '.env'
        
        # Debug: Check file before loading
        print(f"[Email Service] Checking .env file:")
        print(f"[Email Service]   Path: {env_path}")
        print(f"[Email Service]   Exists: {env_path.exists()}")
        if env_path.exists():
            print(f"[Email Service]   Size: {env_path.stat().st_size} bytes")
            # Try to read first few lines (without exposing sensitive data)
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    smtp_lines = [line.strip() for line in lines if 'SMTP' in line.upper() and not line.strip().startswith('#')]
                    print(f"[Email Service]   SMTP-related lines found: {len(smtp_lines)}")
                    for line in smtp_lines:
                        # Show only key name, not value
                        key = line.split('=')[0].strip() if '=' in line else line
                        print(f"[Email Service]     Found: {key}")
            except Exception as e:
                print(f"[Email Service]   Error reading .env: {e}")
        
        # Load environment variables
        result = load_dotenv(dotenv_path=env_path, override=True)
        print(f"[Email Service]   load_dotenv() returned: {result}")
        
        # Debug: Check what's actually in environment
        print(f"[Email Service] Environment variables after load_dotenv():")
        print(f"[Email Service]   SMTP_SERVER: {repr(os.getenv('SMTP_SERVER'))}")
        print(f"[Email Service]   SMTP_PORT: {repr(os.getenv('SMTP_PORT'))}")
        print(f"[Email Service]   SMTP_USERNAME: {repr(os.getenv('SMTP_USERNAME'))}")
        print(f"[Email Service]   SMTP_PASSWORD: {'SET' if os.getenv('SMTP_PASSWORD') else 'NOT SET'} (length: {len(os.getenv('SMTP_PASSWORD', ''))})")
        print(f"[Email Service]   FROM_EMAIL: {repr(os.getenv('FROM_EMAIL'))}")
        print(f"[Email Service]   FROM_NAME: {repr(os.getenv('FROM_NAME'))}")
        
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '').strip()
        # Remove spaces from app password (Gmail app passwords sometimes have spaces when copied)
        self.smtp_password = os.getenv('SMTP_PASSWORD', '').replace(' ', '').strip()
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username).strip()
        self.from_name = os.getenv('FROM_NAME', 'HR Inventory System')
        
        # Debug logging
        print(f"[Email Service] Final values:")
        print(f"[Email Service]   SMTP Server: {self.smtp_server}")
        print(f"[Email Service]   SMTP Port: {self.smtp_port}")
        print(f"[Email Service]   SMTP Username: {self.smtp_username if self.smtp_username else 'NOT SET'}")
        print(f"[Email Service]   SMTP Password: {'SET' if self.smtp_password else 'NOT SET'}")
        print(f"[Email Service]   From Email: {self.from_email}")
    
    def send_welcome_email(
        self,
        to_email: str,
        username: str,
        full_name: Optional[str],
        temporary_password: str,
        login_url: str = 'http://localhost:3000/login'
    ) -> bool:
        """
        Send welcome email with temporary password to new user
        """
        if not to_email:
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f'Welcome to HR Inventory System - {self.from_name}'
            msg['From'] = f'{self.from_name} <{self.from_email}>'
            msg['To'] = to_email
            
            # Create HTML email body
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }}
                    .content {{
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }}
                    .credentials {{
                        background: white;
                        border: 2px solid #667eea;
                        border-radius: 8px;
                        padding: 20px;
                        margin: 20px 0;
                    }}
                    .credential-item {{
                        margin: 10px 0;
                        padding: 10px;
                        background: #f0f0f0;
                        border-radius: 5px;
                    }}
                    .credential-label {{
                        font-weight: bold;
                        color: #667eea;
                    }}
                    .credential-value {{
                        font-family: monospace;
                        font-size: 16px;
                        color: #333;
                        margin-top: 5px;
                    }}
                    .button {{
                        display: inline-block;
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }}
                    .footer {{
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                    }}
                    .warning {{
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Welcome to HR Inventory System</h1>
                    <p>Jabil Malaysia</p>
                </div>
                
                <div class="content">
                    <p>Hello {full_name or username},</p>
                    
                    <p>Your account has been created successfully. Please use the following credentials to log in:</p>
                    
                    <div class="credentials">
                        <div class="credential-item">
                            <div class="credential-label">Username:</div>
                            <div class="credential-value">{username}</div>
                        </div>
                        <div class="credential-item">
                            <div class="credential-label">Temporary Password:</div>
                            <div class="credential-value">{temporary_password}</div>
                        </div>
                    </div>
                    
                    <div class="warning">
                        <strong>[IMPORTANT]</strong> Please change your password after your first login for security purposes.
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{login_url}" class="button">Login Now</a>
                    </p>
                    
                    <p>If you have any questions or need assistance, please contact your system administrator.</p>
                    
                    <div class="footer">
                        <p>This is an automated email from HR Inventory System - Jabil Malaysia</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Create plain text version
            text_body = f"""
Welcome to HR Inventory System - Jabil Malaysia

Hello {full_name or username},

Your account has been created successfully. Please use the following credentials to log in:

Username: {username}
Temporary Password: {temporary_password}

[IMPORTANT] Please change your password after your first login for security purposes.

Login URL: {login_url}

If you have any questions or need assistance, please contact your system administrator.

---
This is an automated email from HR Inventory System - Jabil Malaysia
Please do not reply to this email.
            """
            
            # Attach parts
            part1 = MIMEText(text_body, 'plain')
            part2 = MIMEText(html_body, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Send email
            if not self.smtp_username or not self.smtp_password:
                print(f"[Email Service] SMTP credentials not configured. Would send email to {to_email}")
                print(f"[Email Service] Username: {username}, Password: {temporary_password}")
                print(f"[Email Service] Please configure SMTP_USERNAME and SMTP_PASSWORD in .env file")
                return False
            
            # Validate email configuration
            if '@' not in self.smtp_username:
                print(f"[Email Service] Invalid SMTP_USERNAME format: {self.smtp_username}")
                print(f"[Email Service] SMTP_USERNAME should be a valid email address")
                return False
            
            print(f"[Email Service] Attempting to send email to {to_email} via {self.smtp_server}:{self.smtp_port}")
            print(f"[Email Service] Using SMTP account: {self.smtp_username}")
            print(f"[Email Service] From: {self.from_name} <{self.from_email}>")
            print(f"[Email Service] To: {to_email}")
            print(f"[Email Service] Subject: Welcome to HR Inventory System - {self.from_name}")
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                print(f"[Email Service] Connected to SMTP server")
                server.starttls()
                print(f"[Email Service] TLS started")
                server.login(self.smtp_username, self.smtp_password)
                print(f"[Email Service] Logged in successfully")
                server.send_message(msg)
                print(f"[Email Service] Message sent to SMTP server")
            
            print(f"[Email Service] [SUCCESS] Welcome email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            print(f"[Email Service] [ERROR] SMTP Authentication Error: {str(e)}")
            print(f"[Email Service] Check your SMTP_USERNAME and SMTP_PASSWORD in .env file")
            print(f"[Email Service] For Gmail, make sure you're using App Password, not regular password")
            return False
        except smtplib.SMTPException as e:
            print(f"[Email Service] [ERROR] SMTP Error: {str(e)}")
            return False
        except Exception as e:
            print(f"[Email Service] [ERROR] Error sending email to {to_email}: {str(e)}")
            import traceback
            print(f"[Email Service] Traceback: {traceback.format_exc()}")
            return False

# Singleton instance
email_service = EmailService()

