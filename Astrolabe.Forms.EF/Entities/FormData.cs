using System.ComponentModel.DataAnnotations;
using Astrolabe.FormDesigner.EF;

namespace Astrolabe.Forms.EF;

public class FormData
{
    [Key]
    public Guid Id { get; set; }
    public Guid CreatorId { get; set; }
    public Person Creator { get; set; }
    public string Data { get; set; }
    public Guid Type { get; set; }
    public FormDefinition Definition { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
