import React from "react";
import "./contact.scss";

export default function Contact() {
  return (
    <div className="contact-page">
      <div className="contact-container">
        <div className="contact-header">
          <h1>Contact Us</h1>
          <p>
            Get in touch with the Spin Hobby team! We're here to help with your
            anime collectibles journey.
          </p>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <div className="contact-methods">
              <div className="contact-method">
                <h3>📧 Email</h3>
                <p>
                  <a href="mailto:info@spinhobby.com">info@spinhobby.com</a>
                </p>
                <p>For general inquiries, orders, and support</p>
              </div>

              <div className="contact-method">
                <h3>💬 Discord</h3>
                <p>
                  <a
                    href="https://discord.gg/8RM9qPznR"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join our Discord
                  </a>
                </p>
                <p>Fastest way to reach us and the community</p>
              </div>

              <div className="contact-method">
                <h3>🟩 Square Messaging</h3>
                <p>
                  <a
                    href="https://spinhobby.square.site/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message us on Square
                  </a>
                </p>
                <p>Message us directly through our Square store</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
