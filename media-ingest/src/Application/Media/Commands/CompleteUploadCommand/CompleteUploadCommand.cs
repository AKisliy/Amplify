namespace MediaIngest.Application.Media.Commands.CompleteUploadCommand;

public record CompleteUploadCommand(Guid MediaId) : IRequest;