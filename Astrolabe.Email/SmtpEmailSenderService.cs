using System.Net;
using System.Net.Mail;

namespace Astrolabe.Email;

public class SmtpEmailSenderService : IEmailSenderService
{
    private readonly Func<SmtpClient> _smtpClientBuilder;
    private readonly string _from;

    public SmtpEmailSenderService(Func<SmtpClient> smtpClientBuilder, string from)
    {
        _smtpClientBuilder = smtpClientBuilder;
        _from = from;
    }

    public async Task SendEmail(string to, string subject, string message, bool notHtml = false, string? from = null)
    {
        using var smtpClient = _smtpClientBuilder(); 
        await smtpClient.SendMailAsync(new MailMessage(from ?? _from, to, subject, message) {IsBodyHtml = !notHtml});
    }
}
