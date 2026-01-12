using Publisher.Core.Enums;

namespace Publisher.Application.Common.Interfaces.Factory;

public interface IAccountPickerFactory
{
    IAccountPicker GetAccountPicker(VideoFormat format);
}

