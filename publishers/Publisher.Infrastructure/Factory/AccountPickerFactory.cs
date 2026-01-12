using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Interfaces.Factory;
using Publisher.Core.Enums;

namespace Publisher.Infrastructure.Factory;

public class AccountPickerFactory(IEnumerable<IAccountPicker> pickers) : IAccountPickerFactory
{
    public IAccountPicker GetAccountPicker(VideoFormat format)
    {
        var picker = pickers.FirstOrDefault(p => p.SupportedFormats.Contains(format))
            ?? throw new NotImplementedException($"No account picker is supported for format {format}");

        return picker;
    }
}
