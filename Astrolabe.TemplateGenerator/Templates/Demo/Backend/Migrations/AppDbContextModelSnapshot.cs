using __ProjectName__.Data.EF;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace __ProjectName__.Migrations
{
    [DbContext(typeof(AppDbContext))]
    partial class AppDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.0")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity(
                "__ProjectName__.Models.Tea",
                b =>
                {
                    b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uniqueidentifier");

                    b.Property<string>("BrewNotes").HasColumnType("nvarchar(max)");

                    b.Property<bool>("IncludeSpoon").HasColumnType("bit");

                    b.Property<string>("MilkAmount")
                        .IsRequired()
                        .HasConversion<string>()
                        .HasColumnType("nvarchar(max)");

                    b.Property<int>("NumberOfSugars").HasColumnType("int");

                    b.Property<string>("Type")
                        .IsRequired()
                        .HasConversion<string>()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("Id");

                    b.ToTable("Teas", (string)null);
                }
            );
#pragma warning restore 612, 618
        }
    }
}
