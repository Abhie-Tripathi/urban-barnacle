export const emailSenderAddress: string = process.env.EMAIL_SENDER_ADDRESS;

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
        10Times<br>
        help@10times.com<br>
        <a href="https://10times.com">10Times</a></p>
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
