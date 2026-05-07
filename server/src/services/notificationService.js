import dotenv from "dotenv";
dotenv.config();

import twilio from "twilio";
import nodemailer from "nodemailer";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || "demo",
  process.env.TWILIO_AUTH_TOKEN || "demo"
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || "user",
    pass: process.env.SMTP_PASS || "pass",
  },
});

export async function sendEmergencyNotifications(user, alert) {
  const promises = [];

  user.emergency_contacts?.forEach((contact) => {
    if (contact.phone) {
      promises.push(
        client.messages.create({
          to: contact.phone,
          from: process.env.TWILIO_PHONE_NUMBER || "+15555555555",
          body: `SafeSpot alert: ${user.name} needs assistance. Alert ${alert._id}`,
        })
      );
    }

    if (contact.email) {
      promises.push(
        transporter.sendMail({
          to: contact.email,
          from: process.env.SMTP_FROM || "alerts@safespot.org",
          subject: "SafeSpot Emergency Alert",
          text: `${user.name} marked urgent at ${alert.timestamp}.`,
        })
      );
    }
  });

  await Promise.allSettled(promises);
}

export async function sendPersonEmergencyNotifications(person, { message } = {}) {
  const notificationMessage =
    message || `SafeSpot alert: ${person.name} requires immediate assistance.`;

  const contacts = Array.isArray(person.emergencyContacts)
    ? person.emergencyContacts.filter((contact) => contact && contact.phone)
    : [];

  if (!contacts.length) {
    return { notified: 0 };
  }

  const promises = contacts.map((contact) =>
    client.messages
      .create({
        to: contact.phone,
        from: process.env.TWILIO_PHONE_NUMBER || "+15555555555",
        body: notificationMessage,
      })
      .catch((error) => {
        console.error('Failed to send emergency SMS', error.message);
        return null;
      })
  );

  await Promise.allSettled(promises);
  return { notified: contacts.length };
}
