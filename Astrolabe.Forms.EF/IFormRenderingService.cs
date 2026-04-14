namespace Astrolabe.Forms.EF;

public interface IFormRenderingService
{
    Task<FormAndSchemas> GetFormAndSchemas(Guid formId);
}
