using System.Text;
using OpenAI.Audio;

namespace AiGateway.Web.Utils;

public class SrtBuilder
{
    public string BuildSrt(IReadOnlyList<TranscribedWord> words, int maxWords, int maxChars)
    {
        var sb = new StringBuilder();
        var segmentIndex = 1;
        var i = 0;

        while (i < words.Count)
        {
            var segmentWords = new List<string>();
            var charCount = 0;
            var start = words[i].StartTime;
            TimeSpan end = default;

            while (i < words.Count)
            {
                var word = words[i].Word.Trim();
                var newCharCount = charCount == 0 ? word.Length : charCount + 1 + word.Length;

                if (segmentWords.Count >= maxWords || (segmentWords.Count > 0 && newCharCount > maxChars))
                    break;

                segmentWords.Add(word);
                charCount = newCharCount;
                end = words[i].EndTime;
                i++;
            }

            sb.Append(segmentIndex++);
            sb.AppendLine();
            sb.AppendLine($"{FormatSrtTime(start)} --> {FormatSrtTime(end)}");
            sb.AppendLine(string.Join(" ", segmentWords));
            sb.AppendLine();
        }

        return sb.ToString();
    }

    private static string FormatSrtTime(TimeSpan t) =>
        $"{(int)t.TotalHours:D2}:{t.Minutes:D2}:{t.Seconds:D2},{t.Milliseconds:D3}";
}
