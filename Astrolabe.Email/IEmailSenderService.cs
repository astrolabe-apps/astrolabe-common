using System.Net.Mail;

namespace Astrolabe.Email;

public interface IEmailSenderService
{
    Task SendEmail(string to, string subject, string message, bool notHtml = false, string? from = null);
    
}