
using Publisher.Application.Common.Exceptions;

namespace Publisher.Infrastructure.FileSystem;

public static class FileSystemUtil
{
    public static async Task WriteTextFileAsync(string filePath, string content)
    {
        try
        {
            await File.WriteAllTextAsync(filePath, content);
        }
        catch (Exception ex)
        {
            throw new IOException($"Ошибка записи файла {filePath}: {ex.Message}", ex);
        }
    }

    public static async Task<bool> FileExistsAsync(string filePath)
    {
        return await Task.Run(() => File.Exists(filePath));
    }

    public static async Task DeleteFileAsync(string filePath)
    {
        try
        {
            if (await FileExistsAsync(filePath))
            {
                await Task.Run(() => File.Delete(filePath));
            }
        }
        catch (Exception ex)
        {
            throw new IOException($"Ошибка удаления файла {filePath}: {ex.Message}", ex);
        }
    }

    public static string GetTempFilePath(string extension)
    {
        string fileName = $"{Guid.NewGuid()}{extension}";
        var tempFolderPath = Environment.GetEnvironmentVariable("TEMP_PATH") ?? Path.GetTempPath();
        return Path.Combine(tempFolderPath, fileName);
    }

    public static string GetFileSavingPath(int groupId, string extension)
    {
        var defaultSavingPath = GetBaseSavingDirectory();

        var groupSavingPath = Path.Combine(defaultSavingPath, groupId.ToString());

        if (!Directory.Exists(groupSavingPath))
            Directory.CreateDirectory(groupSavingPath);

        var fileUniqueIdentifier = Guid.NewGuid();
        var absolutePath = Path.Combine(groupSavingPath, $"{fileUniqueIdentifier}{extension}");
        return absolutePath;
    }

    public static string GetFileSavingPath(string folderName, string extension)
    {
        var defaultSavingPath = GetBaseSavingDirectory();

        var groupSavingPath = Path.Combine(defaultSavingPath, folderName);

        if (!Directory.Exists(groupSavingPath))
            Directory.CreateDirectory(groupSavingPath);

        var fileUniqueIdentifier = Guid.NewGuid();
        return Path.Combine(groupSavingPath, $"{fileUniqueIdentifier}{extension}");
    }

    public static string GetFileSavingPath(string extension)
    {
        var fileUniqueIdentifier = Guid.NewGuid();
        return Path.Combine(GetBaseSavingDirectory(), $"{fileUniqueIdentifier}{extension}");
    }

    public static string GetAbsoluteFilePath(string relativeFilePath)
    {
        var defaultSavingPath = GetBaseSavingDirectory();

        return Path.Combine(defaultSavingPath, relativeFilePath);
    }

    public static string GetRelativeToSavingDirectoryPath(string absolutePath)
    {
        var defaultSavingPath = GetBaseSavingDirectory();

        return Path.GetRelativePath(defaultSavingPath, absolutePath);
    }

    public static async Task SaveStreamToPath(Stream stream, string path)
    {
        await using var fileStream = File.Create(path);
        stream.CopyTo(fileStream);
    }

    public static async Task SaveContentToPath(byte[] content, string path)
    {
        await using var fileStream = File.Create(path);
        await fileStream.WriteAsync(content);
    }

    public static long GetFileSize(string filePath)
    {
        return new FileInfo(filePath).Length;
    }

    public static Stream GetFileStream(string filePath)
    {
        return File.OpenRead(filePath);
    }

    private static string GetBaseSavingDirectory()
    {
        var defaultSavingPath = Environment.GetEnvironmentVariable("SAVING_PATH") ??
            throw new ConfigurationException("SAVING_PATH env variable is not specified");

        if (!Directory.Exists(defaultSavingPath))
            throw new ConflictException("Default saving directory doesn't exist. Check SAVING_PATH env variable");

        return defaultSavingPath;
    }
}
