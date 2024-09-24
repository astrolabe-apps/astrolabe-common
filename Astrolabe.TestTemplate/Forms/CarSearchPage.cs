using Astrolabe.SearchState;
using Astrolabe.TestTemplate.Controllers;

namespace Astrolabe.TestTemplate.Forms;

public record CarSearchPage(SearchQueryState Request, IEnumerable<CarEdit> Results);
