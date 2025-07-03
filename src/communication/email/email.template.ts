export const emailSenderAddress: string =
  process.env.EMAIL_SENDER_ADDRESS ?? '';

export const signUpINEmailHtml = `
     <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign-in OTP</title>
    </head>
    <body>
        <p>Hi {user.firstname},</p>
        <p>To complete your {sign} process, please use the One-Time Password (OTP) provided below. This OTP is valid for the next 5 minutes.</p>
        <p><strong>Your OTP:</strong> {otp}</p>
        <p>If you did not request this code, please ignore this email or contact our support team immediately.</p>
        <p>For your security, do not share this OTP with anyone.</p>
        <p>Best regards,<br>
        Whr.ai<br>
        <a href="https://whr.ai">Whr.ai</a></p>
        <hr>
        <p><em>Note:</em> This is an automated email, please do not reply directly to this message.</p>
    </body>
    </html>
    `;
export const trackerAccessHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
</head>
<body>
    <p>Hi {givenToUserName},</p>
    <p>I hope you're well.</p>
    <p>I'm excited to invite you to use a tracker created to monitor event trends.</p>
    <p>Access the tracker: <a href="{redirectUrl}">link</a></p>
    <p>Thanks,<br>
  {givenByUserName}<br>
    {givenByUserDesignation}<br>
</body>
</html>
`;

// sub ->  `New Interest for {eventData?.name}!`,
export const intendInterestOwnerHtml = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Email Notification</title>
      <style>
          body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }

      .logo {
        text-align: center;
        margin-bottom: 20px;
      }

      .logo img {
        display: inline-block;
        max-width: 50px;
        height: auto;
        vertical-align: middle;
        margin-right: 10px;
      }

      .logo .brand {
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }

      .content {
        font-size: 16px;
        line-height: 1.5;
      }

      .event-name {
        font-size: 22px;
        font-weight: bold;
        text-transform: capitalize;
        margin-bottom: 10px;
      }

      .event-details {
        margin: 15px 0;
        display: block;
      }

      .date-icon {
        display: inline-block;
        width: 40px;
        height: 55px;
        border-radius: 8px;
        background-color: #fff;
        text-align: center;
        border: 1px solid #464545;
        font-family: Arial, sans-serif;
        font-weight: 600;
        margin-right: 20px;
        overflow: hidden;
      }

      .date-icon .month {
        background-color: #d6d6d6;
        width: 100%;
        padding: 2px 0;
      }

      .event-info {
        display: inline-block;
        vertical-align: top;
      }

      .button, .res {
        background: linear-gradient(45deg, #7b1fa2, #a045ff);
        color: #fff;
        padding: 12px 30px;
        border: none;
        border-radius: 5px;
        text-align: center;
        text-decoration: none;
        font-size: 16px;
        display: inline-block;
        margin: 15px 5px;
        cursor: pointer;
        transition: background 0.3s ease, box-shadow 0.3s ease;
      }

      .button:hover, .res:hover {
        background: linear-gradient(45deg, #a045ff, #7b1fa2);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      }

      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }

      .footer a {
        color: #007bff;
        text-decoration: none;
      }

      .location-icon {
        margin-top: 15px;
        display: block;
      }

      .locationIconContainer {
        display: inline-block;
        width: 40px;
        height: 55px;
        border-radius: 8px;
        background-color: #fff;
        text-align: center;
        border: 1px solid #464545;
        vertical-align: top;
        margin-right: 15px;
      }

      .locationIconContainer img {
        width: 20px;
        height: 30px;
        margin-top: 10px;
      }

      .event-info {
        display: inline-block;
        vertical-align: top;
        padding-left: 6px;
      }
      .button-container {
        text-align: center;
        margin: 30px 0;
      }

      .button-container a {
        text-decoration: none;
        background-color: #4a56f0;
        color: #ffffff;
        padding: 15px 25px;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
      }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Company Info -->
        <div class="header">
          <div class="logo">
            <img
              src="https://{FRONTEND_URL}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
              alt="Whr.ai"
            />
            <span class="brand">Whr.ai</span>
          </div>
        </div>
  
        <!-- Main Content -->
        <div class="content">
          <div class="main-message">
            <span class="name">{userShowedInterestName},</span> <br />
            <span class="event-message">registered for your event</span>
          </div>
          <p>
            <a style="color: #007bff; text-decoration: none"> {userShowedInterestName}</a>
            has registered for <strong>{eventName}</strong>.
          </p>
  
          <!-- Registration Details -->
          <div class="registration-info">
            Here's your registration count so far:
          </div>
  
          <!-- Registration Count -->
          <div class="count-info">
            <ul>
              <li>{pending} pending approval</li>
              <li>{going} going</li>
              <li>{waitlist} on waitlist</li>
              <li>{inviteCount} invited</li>
            </ul>
          </div>
        </div>
        <p>
          <p>Login to see the list of users who have shown interest in the {eventName}. We will continue to keep you updated on registrations and other relevant details if any.</p>
        </p>
  
        <p>
          Best regards,<br />
          EventGeni
        </p>
        <div class="button-container" style="color: #fff;">
          <a href="https://console.Whr.ai/signin">Login Now</a>
        </div>
        <div class="footer">
          <p>
            <a href="#">Unsubscribe from all emails</a> |
            <a href="#">Manage Email Subscription</a>
          </p>
          <p>Copyright ©Whr.ai 2024</p>
        </div>
      </div>
    </body>
  </html>
  `;

export const intendShowedInterestHtml = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333;
      margin: 0;
      padding: 0;
    }

    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .logo {
      text-align: center;
      margin-bottom: 20px;
    }

    .logo img {
      max-width: 50px;
      height: auto;
      margin-right: 10px;
      vertical-align: middle;
    }

    .logo .brand {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }

    .content {
      font-size: 16px;
      line-height: 1.5;
    }

    .event-name {
      font-size: 22px;
      font-weight: bold;
      text-transform: capitalize;
      margin-bottom: 10px;
    }

    .event-details {
      margin: 15px 0;
      display: block;
      border: 0.2px solid #999;
      padding: 10px;
      border-radius: 10px;
    }

    .date-icon {
      display: inline-block;
      width: 40px;
      height: 55px;
      border-radius: 8px;
      background-color: #fff;
      text-align: center;
      border: 1px solid #464545;
      font-weight: 600;
      margin-right: 20px;
    }

    .date-icon .month {
      background-color: #d6d6d6;
      padding: 2px 0;
    }

    .event-info {
      display: inline-block;
      vertical-align: top;
    }

    .button-container {
      text-align: center;
      margin: 30px 0;
    }

    .button-container a {
      text-decoration: none;
      background: linear-gradient(45deg, #7b1fa2, #a045ff);
      color: #ffffff;
      padding: 15px 25px;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      display: inline-block;
    }

    .button-container a:hover {
      background: linear-gradient(45deg, #a045ff, #7b1fa2);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .footer {
      font-size: 12px;
      color: #999;
      text-align: center;
      margin-top: 20px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }

    .footer a {
      color: #007bff;
      text-decoration: none;
    }

    .location-icon {
      margin-top: 15px;
      display: block;
    }

    .locationIconContainer {
      display: inline-block;
      width: 40px;
      height: 55px;
      border-radius: 8px;
      background-color: #fff;
      text-align: center;
      border: 1px solid #464545;
      margin-right: 15px;
    }

    .locationIconContainer img {
      width: 20px;
      height: 30px;
      margin-top: 10px;
    }

    .event-info {
      padding-left: 6px;
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="logo">
      <img
        src="https://{FRONTEND_URL}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
        alt="Whr.ai Logo" />
      <span class="brand">Whr.ai</span>
    </div>

    <div class="content">
      <p>Hello {userShowedName},</p>
      <p>Your registration {secondLine} for</p>
      <div class="event-name">{eventName}</div>

      <div class="event-details">
        <div class="date-icon">
          <div class="month">{date[2]}</div>
          <div class="day">{date[1]}</div>
        </div>

        <div class="event-info">
          <strong>{date[0]}, {date[1]} {date[2]}</strong><br />
          {start_time} - {end_time} GMT +5:30
        </div>

        <div class="location-icon">
          <div class="locationIconContainer">
            <img src="https://api.Whr.ai/public/f2ee2309-e6c5-4e51-90a8-5aa0ce7c6aed.png" alt="Location Icon" />
          </div>
          <div class="event-info">
            <strong>{location}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="button-container">
      <a href="{redirectUrl}" class="button">Event Page</a>
    </div>

    <div class="footer">
      <p>
        <a href="#">Unsubscribe</a> from this list at any time.
      </p>
      <p>Manage Email Preferences</p>
      <p>Copyright © 10Times</p>
    </div>
  </div>
</body>

</html>
`;

//  subject: `Event Canceled: {event.name}`,
export const eventCancelMailToUsersHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }

      .logo {
        text-align: center;
        margin-bottom: 20px;
      }

      .logo img {
        display: inline-block;
        max-width: 50px;
        height: auto;
        vertical-align: middle;
        margin-right: 10px;
      }

      .logo .brand {
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }

      .content {
        font-size: 16px;
        line-height: 1.5;
      }

      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }

      .footer a {
        color: #007bff;
        text-decoration: none;
      }
    </style>
  </head>

  <body>
    <div class="email-container">
      <div class="logo">
        <img
          src="https://{FRONTEND_URL}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
          alt="Whr.ai"
        />
        <span class="brand">Whr.ai</span>
      </div>

      <!-- Email Content -->
      <div class="content">
        <p>Hello there,</p>
        <p>
          We want to let you know that the host of
          <strong>{eventName}</strong> has canceled the event.
        </p>
        <p>See you next time!</p>
      </div>
      <div class="footer">
        <p><a href="#">Unsubscribe</a> from this list at any time.</p>
        <p>Manage Email Preferences</p>
        <p>Copyright © 10Times</p>
      </div>
    </div>
  </body>
</html>
`;

export const eventCancelMailToAdminHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Event Canceled</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        display: inline-block;
        width: 100%;
        text-align: left;
        margin-bottom: 20px;
      }
      .header img {
        vertical-align: middle;
        max-width: 30px;
        margin-right: 10px;
      }
      .header h3 {
        display: inline;
        vertical-align: middle;
        font-size: 18px;
        font-weight: normal;
        color: #333;
      }

      .content {
        font-size: 16px;
        line-height: 1.5;
      }
      .content h1 {
        font-size: 24px;
        margin-bottom: 10px;
        color: #333;
      }
      .content p {
        font-size: 16px;
        margin-bottom: 10px;
        color: #333;
      }
      .reply-text {
        font-size: 14px;
        color: #666;
        padding-left: 20px; /* To indent like a reply */
        margin-top: 20px;
        border-left: 2px solid #ddd; /* Adds a line to the left like a reply message */
      }

      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }

      .footer a {
        color: #007bff;
        text-decoration: none;
      }
      .logo {
        text-align: center;
        margin-bottom: 20px;
      }
      .logo img {
        display: inline-block;
        max-width: 50px;
        height: auto;
        vertical-align: middle;
        margin-right: 10px;
      }

      .logo .brand {
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header section with logo and name -->
      <div class="logo">
        <img
          src="https://{FRONTEND_URL}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
          alt="Whr.ai"
        />
        <span class="brand">Whr.ai</span>
      </div>

      <!-- Main content section -->
      <div class="content">
        <h1>{eventName} was Canceled</h1>
        <p>
         {eventName} has been canceled. We have notified guests with the
          following email:
        </p>

        <!-- Reply-like text -->
        <div class="reply-text">
          <p>Hello there,</p>
          <p>
            We want to let you know that the host of {eventName} has canceled
            the event.
          </p>
          <p>See you next time!</p>
        </div>
      </div>

      <!-- Footer section -->
      <div class="footer">
        <p><a href="#">Unsubscribe</a> from this list at any time.</p>
        <p>Manage Email Preferences</p>
        <p>Copyright © 10Times</p>
      </div>
    </div>
  </body>
</html>
`;
/// `Registration Update: {eventData?.name}!`,
export const intendUpdateEmailToUserHtml = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333;
      margin: 0;
      padding: 0;
    }

    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .logo {
      text-align: center;
      margin-bottom: 20px;
    }

    .logo img {
      max-width: 50px;
      height: auto;
      margin-right: 10px;
      vertical-align: middle;
    }

    .logo .brand {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }

    .content {
      font-size: 16px;
      line-height: 1.5;
    }

    .event-name {
      font-size: 22px;
      font-weight: bold;
      text-transform: capitalize;
      margin-bottom: 10px;
    }

    .event-details {
      margin: 15px 0;
      display: block;
      border: 0.2px solid #999;
      padding: 10px;
      border-radius: 10px;
    }

    .date-icon {
      display: inline-block;
      width: 40px;
      height: 55px;
      border-radius: 8px;
      background-color: #fff;
      text-align: center;
      border: 1px solid #464545;
      font-weight: 600;
      margin-right: 20px;
    }

    .date-icon .month {
      background-color: #d6d6d6;
      padding: 2px 0;
    }

    .event-info {
      display: inline-block;
      vertical-align: top;
    }

    .button-container {
      text-align: center;
      margin: 30px 0;
    }

    .button-container a {
      text-decoration: none;
      background: linear-gradient(45deg, #7b1fa2, #a045ff);
      color: #ffffff;
      padding: 15px 25px;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      display: inline-block;
    }

    .button-container a:hover {
      background: linear-gradient(45deg, #a045ff, #7b1fa2);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .footer {
      font-size: 12px;
      color: #999;
      text-align: center;
      margin-top: 20px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }

    .footer a {
      color: #007bff;
      text-decoration: none;
    }

    .location-icon {
      margin-top: 15px;
      display: block;
    }

    .locationIconContainer {
      display: inline-block;
      width: 40px;
      height: 55px;
      border-radius: 8px;
      background-color: #fff;
      text-align: center;
      border: 1px solid #464545;
      margin-right: 15px;
    }

    .locationIconContainer img {
      width: 20px;
      height: 30px;
      margin-top: 10px;
    }

    .event-info {
      padding-left: 6px;
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="logo">
      <img
        src="https://{FRONTEND_URL}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
        alt="Whr.ai Logo" />
      <span class="brand">Whr.ai</span>
    </div>

    <div class="content">
      <p>Hello {userShowedInterestName},</p>
      <p>Your registration {secondLine} for</p>
      <div class="event-name">{eventName}</div>

      <div class="event-details">
        <div class="date-icon">
          <div class="month">{date[2]}</div>
          <div class="day">{date[1]}</div>
        </div>

        <div class="event-info">
          <strong>{date[0]}, {date[1]} {date[2]}</strong><br />
          {start_time} - {end_time} GMT +5:30
        </div>

        <div class="location-icon">
          <div class="locationIconContainer">
            <img src="https://api.Whr.ai/public/f2ee2309-e6c5-4e51-90a8-5aa0ce7c6aed.png" alt="Location Icon" />
          </div>
          <div class="event-info">
             <strong>{location}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="button-container">
      <a href="{redirectUrl}" class="button">Event Page</a>
    </div>

    <div class="footer">
      <p>
        <a href="#">Unsubscribe</a> from this list at any time.
      </p>
      <p>Manage Email Preferences</p>
      <p>Copyright © 10Times</p>
    </div>
  </div>
</body>

</html>
`;

// `You are invited to {eventData.name}`,
export const inviteEmailToEventHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }

      .logo {
        text-align: center;
        margin-bottom: 20px;
      }

      .logo img {
        display: inline-block;
        max-width: 50px;
        height: auto;
        vertical-align: middle;
        margin-right: 10px;
      }

      .logo .brand {
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }

      .content {
        font-size: 16px;
        line-height: 1.5;
      }

      .event-name {
        font-size: 22px;
        font-weight: bold;
        text-transform: capitalize;
        margin-bottom: 10px;
      }

      .button,
      .res {
        background: #7b1fa2;
        color: #fff;
        padding: 12px 30px;
        border: none;
        border-radius: 5px;
        text-align: center;
        text-decoration: none;
        font-size: 16px;
        display: inline-block;
        margin: 15px 5px;
        cursor: pointer;
      }

      .button:hover,
      .res:hover {
        background: #a045ff;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        color: #fff;
      }

      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }

      .footer a {
        color: #007bff;
        text-decoration: none;
      }
    </style>
  </head>

  <body>
    <div class="email-container">
      <div class="logo">
        <img
          src="https://{FRONTEND_URL}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
          alt="Whr.ai"
        />
        <span class="brand">Whr.ai</span>
      </div>

      <!-- Email Content -->
      <div class="content">
        <p>You are invited to</p>
        <div class="event-name">{eventName}</div>

        <!-- Event Details -->
        <div class="event-details" style="border: 1px solid #999; padding: 10px; border-radius: 8px; display: block;">
          <div
            class="date-icon"
            style="
              display: inline-block;
              width: 40px;
              height: 55px;
              border-radius: 8px;
              background-color: #fff;
              text-align: center;
              border: 1px solid #464545;
              margin-right: 20px;
            "
          >
            <div class="month" style="background-color: #d6d6d6; padding: 2px 0;">{date[2]}</div>
            <div class="day">{date[1]}</div>
          </div>
          <div class="event-info" style="display: inline-block; vertical-align: top;">
            <strong>{date[0]}, {date[1]} {date[2]}</strong><br />
            {start_time} - {end_time} GMT +5:30
          </div>

          <!-- Location Icon and Text -->
          <div class="location-icon" style="margin-top: 15px; display: block;">
            <div
              class="locationIconContainer"
              style="
                display: inline-block;
                width: 40px;
                height: 55px;
                border-radius: 8px;
                background-color: #fff;
                text-align: center;
                border: 1px solid #464545;
                vertical-align: top;
                margin-right: 15px;
              "
            >
              <img
                src="https://api.Whr.ai/public/f2ee2309-e6c5-4e51-90a8-5aa0ce7c6aed.png"
                alt="Location Icon"
                style="width: 20px; height: 30px; margin-top: 10px;"
              />
            </div>
            <div class="event-info" style="display: inline-block; vertical-align: top; padding-left: 6px;">
               <strong>{location}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div style="text-align: center;">
        <a href="{redirectUrl}?{encryptYes}" class="res" style="color: #fff;">Accept Invite</a>
        <a href="{redirectUrl}?{encryptNo}" class="res" style="color: #fff;">Cancel Invite</a>
        <a href="{redirectUrl}" class="button" style="color: #fff;">Event Page</a>
      </div>

      <div class="footer">
        <p>
          <a href="#">Unsubscribe</a> from this list at any time.
        </p>
        <p>Manage Email Preferences</p>
        <p>Copyright © 10Times</p>
      </div>
    </div>
  </body>
</html>
`;


export const errorTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>API Error Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            background: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .header {
            font-size: 20px;
            font-weight: bold;
            color: #d9534f;
        }
        .details {
            text-align: left;
            margin-top: 10px;
            font-size: 14px;
        }
        .error {
            color: #d9534f;
            font-weight: bold;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            margin-top: 20px;
            background-color: #0275d8;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <p class="header">🚨 API Error Alert 🚨</p>
        <p>An error occurred in your API service.</p>

        <div class="details">
            <p><strong>API Name:</strong> <span class="error">{api_name}</span></p>
            <p><strong>Error Type:</strong> <span class="error">{error_type}</span></p>
            <p><strong>Message:</strong> {error_message}</p>
            <p><strong>Timestamp:</strong> {timestamp}</p>
        </div>

        <p class="footer">This is an automated email. Please do not reply.</p>
    </div>
</body>
</html>
`


export const inviteUserEmailTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WHR.ai Invitation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            margin: auto;
        }
        .button {
            display: inline-block;
            background-color: #007BFF;
            color: #ffffff;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
        .footer {
            font-size: 12px;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <p>Hello <strong>{invitedUserName}</strong>,</p>
        <p>You have been referred by <strong>{referredByUserName}</strong> to explore <a href="https://whr.ai" target="_blank">whr.ai</a>, a platform that provides intelligence on real-world events to help you plan better, forecast accurately, and make informed business decisions.</p>
        <p>Start leveraging event intelligence today!</p>
        <p><a href="https://whr.ai" class="button">Explore WHR.ai</a></p>
        <p class="footer">Best,<br>The WHR Team</p>
    </div>
</body>
</html>
`

export const demoContactEmailTemplate: string = ` <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Contact Form - whr.ai</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 20px;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              h2 {
                text-align: center;
                color: #333;
              }
              .field {
                margin-bottom: 15px;
              }
              .label {
                font-weight: bold;
              }
              .value {
                margin-left: 5px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Demo Form Submission For {Source}</h2>
              <div class="field">
                <span class="label">First Name:</span>
                <span class="value">{firstName}</span>
              </div>
              <div class="field">
                <span class="label">Last Name:</span>
                <span class="value">{lastName}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">{email}</span>
              </div>
              <div class="field">
                <span class="label">Company Name:</span>
                <span class="value">{companyName}</span>
              </div>
              <div class="field">
                <span class="label">Job Title</span>
                <span class="value">{jobTitle}</span>
              </div>
              <div class="field">
                <span class="label">Phone Number</span>
                <span class="value">{phoneNumber}</span>
              </div>
              </div>
                <div class="field">
                <span class="label">Source:</span>
                <span class="value">{Source}</span>
              </div>
            </div>
          </body>
        </html>`

export const contactUsEmailTemplate: string = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Contact Form - whr.ai</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 20px;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              h2 {
                text-align: center;
                color: #333;
              }
              .field {
                margin-bottom: 15px;
              }
              .label {
                font-weight: bold;
              }
              .value {
                margin-left: 5px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Demo Form Submission For {Source}</h2>
              <div class="field">
                <span class="label">First Name:</span>
                <span class="value">{firstName}</span>
              </div>
              <div class="field">
                <span class="label">Last Name:</span>
                <span class="value">{lastName}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">{email}</span>
              </div>
              <div class="field">
                <span class="label">Message:</span>
                <span class="value">{message}</span>
              </div>
                <div class="field">
                <span class="label">Source:</span>
                <span class="value">{Source}</span>
              </div>
          </body>
        </html>`


export const contactApiLimitReachedTemplate: string = `
        <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Contact Limit Reached - Admin Alert</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f2f2f2; padding: 30px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 6px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 24px;">
        <h2 style="color: #d9534f;">⚠️ Contact Limit Reached</h2>
        <p style="color: #333333; font-size: 15px;">
          Hello Admin,
        </p>
        <p style="color: #333333; font-size: 15px;">
          A contact submission limit has been reached in the system. Please review the details below:
        </p>

        <table cellpadding="8" cellspacing="0" width="100%" style="background-color: #f9f9f9; border: 1px solid #ddd; margin: 20px 0; border-radius: 4px;">
          <tr>
            <td><strong>User Name:</strong></td>
            <td>{name}<td>
          </tr>
        <tr>
            <td><strong>User Email:</strong></td>
            <td>{email}<td>
          </tr>
          <tr>
            <td><strong>User Submissions Today:</strong></td>
            <td>{userLimit} / 5 allowed</td>
          </tr>
          <tr>
            <td><strong>Global Submissions Today:</strong></td>
            <td>{dailyLimit} / 500 allowed</td>
          </tr>
          <tr>
            <td><strong>Date:</strong></td>
            <td>{time}</td>
          </tr>
        </table>

        <p style="color: #333333; font-size: 15px;">
          No further contact submissions will be processed today for this user or globally, depending on the limit hit.
        </p>

        <p style="color: #333333; font-size: 15px;">
          You can monitor or adjust limits in the admin panel if necessary.
        </p>

        <p style="color: #666666; font-size: 13px;">
          — System Notification
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`
export const exportCompleteMailTemplate: string =
  `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Export Event Data</h2>
      <p>Dear {firstName} {lastName},</p>
      <p>Thank you for your request to export event data. Please find the download button below to retrieve your requested data:</p>
      <p><a href='{redirectLink}' style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Download Data</a></p>
      <p>If you have any questions or need further assistance, feel free to contact us.</p>
      <p>Best regards,<br>
        Whr.ai<br>
        help@whr.ai<br>
        <a href="https://whr.ai/">Whr.ai</a></p>
        <hr>
        <p><em>Note:</em> This is an automated email, please do not reply directly to this message.</p>
    </div>
  </body>
  </html>
  `;

export const exportFailMailTemplate: string =
  `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Export Data Request Failed</h2>
        <p>Dear {firstName} {lastName},</p>
        <p>We regret to inform you that your request to export event data has failed. Please try again later. We apologize for any inconvenience this may have caused.</p>
        <p>If the issue persists or if you need further assistance, please don't hesitate to contact us.</p>
         <p>Best regards,<br>
        Whr.ai<br>
        help@whr.ai<br>
        <a href="https://whr.ai/">Whr.ai</a></p>
        <hr>
        <p><em>Note:</em> This is an automated email, please do not reply directly to this message.</p>
      </div>
    </body>
    </html>
    `;
