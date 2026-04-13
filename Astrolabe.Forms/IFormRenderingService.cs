namespace Astrolabe.Forms;

public interface IFormRenderingService
{
    Task<FormAndSchemas> GetFormAndSchemas(Guid formId);
}