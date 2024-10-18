using Astrolabe.SearchState;
using Astrolabe.TestTemplate.Controllers;

namespace Astrolabe.TestTemplate.Forms;

public record CarSearchPage(SearchOptions Request, SearchResults<CarInfo> Results, bool Loading);
