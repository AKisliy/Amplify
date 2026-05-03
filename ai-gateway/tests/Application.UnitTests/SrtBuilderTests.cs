using System.ClientModel.Primitives;
using System.Globalization;
using AiGateway.Web.Utils;
using OpenAI.Audio;

namespace Application.UnitTests;

[TestFixture]
public class SrtBuilderTests
{
    private SrtBuilder _sut = null!;

    [SetUp]
    public void Setup() => _sut = new SrtBuilder();

    private static TranscribedWord Word(string text, double startSec, double endSec)
    {
        var start = startSec.ToString(CultureInfo.InvariantCulture);
        var end = endSec.ToString(CultureInfo.InvariantCulture);
        return ModelReaderWriter.Read<TranscribedWord>(
            BinaryData.FromString($$$"""{"word":"{{{text}}}","start":{{{start}}},"end":{{{end}}}}"""))!;
    }

    [Test]
    public void BuildSrt_FewWords_ProducesSingleSegment()
    {
        var words = new[]
        {
            Word("Привет", 0.0, 0.4),
            Word("мир", 0.5, 0.8),
        };

        var srt = _sut.BuildSrt(words, maxWords: 6, maxChars: 40);

        var blocks = ParseBlocks(srt);

        blocks.ShouldHaveSingleItem();
        blocks[0].Text.ShouldBe("Привет мир");
        blocks[0].Start.ShouldBe("00:00:00,000");
        blocks[0].End.ShouldBe("00:00:00,800");
    }

    [Test]
    public void BuildSrt_ExceedsMaxWords_SplitsIntoMultipleSegments()
    {
        var words = new[]
        {
            Word("один",   0.0, 0.5),
            Word("два",    0.6, 1.0),
            Word("три",    1.1, 1.5),
            Word("четыре", 1.6, 2.0),
            Word("пять",   2.1, 2.5),
            Word("шесть",  2.6, 3.0),
            Word("семь",   3.1, 3.5),
        };

        var srt = _sut.BuildSrt(words, maxWords: 3, maxChars: 100);

        var blocks = ParseBlocks(srt);
        blocks.Count.ShouldBe(3);
        blocks[0].Text.ShouldBe("один два три");
        blocks[1].Text.ShouldBe("четыре пять шесть");
        blocks[2].Text.ShouldBe("семь");
    }

    [Test]
    public void BuildSrt_ExceedsMaxChars_SplitsBeforeOverflowingWord()
    {
        // "Гидроэлектростанция" = 19 chars; maxChars=25 means only 1 such word per segment
        var words = new[]
        {
            Word("Гидроэлектростанция", 0.0, 1.0),
            Word("Гидроэлектростанция", 1.1, 2.0),
            Word("Гидроэлектростанция", 2.1, 3.0),
        };

        var srt = _sut.BuildSrt(words, maxWords: 6, maxChars: 25);

        var blocks = ParseBlocks(srt);
        blocks.Count.ShouldBe(3);
        blocks[0].Text.ShouldBe("Гидроэлектростанция");
        blocks[1].Text.ShouldBe("Гидроэлектростанция");
        blocks[2].Text.ShouldBe("Гидроэлектростанция");
    }

    [Test]
    public void BuildSrt_TimestampsAreCorrect()
    {
        var words = new[]
        {
            Word("раз", 1.0, 1.5),
            Word("два", 1.6, 2.0),
            Word("три", 3.0, 3.8),
            Word("четыре", 4.0, 4.5),
        };

        var srt = _sut.BuildSrt(words, maxWords: 2, maxChars: 100);

        var blocks = ParseBlocks(srt);
        blocks[0].Start.ShouldBe("00:00:01,000");
        blocks[0].End.ShouldBe("00:00:02,000");
        blocks[1].Start.ShouldBe("00:00:03,000");
        blocks[1].End.ShouldBe("00:00:04,500");
    }

    [Test]
    public void BuildSrt_BlocksAreNumberedSequentially()
    {
        var words = Enumerable.Range(1, 9)
            .Select(i => Word($"слово{i}", i - 1, i * 0.9))
            .ToArray();

        var srt = _sut.BuildSrt(words, maxWords: 3, maxChars: 100);

        var blocks = ParseBlocks(srt);
        for (var i = 0; i < blocks.Count; i++)
            blocks[i].Number.ShouldBe(i + 1);
    }

    [Test]
    public void BuildSrt_EmptyInput_ReturnsEmptyString()
    {
        var srt = _sut.BuildSrt([], maxWords: 6, maxChars: 40);

        srt.Trim().ShouldBeEmpty();
    }


    private record SrtBlock(int Number, string Start, string End, string Text);

    private static List<SrtBlock> ParseBlocks(string srt)
    {
        var blocks = new List<SrtBlock>();
        foreach (var raw in srt.Split("\n\n", StringSplitOptions.RemoveEmptyEntries))
        {
            var lines = raw.Trim().Split('\n');
            if (lines.Length < 3) continue;
            var timing = lines[1].Split(" --> ");
            blocks.Add(new SrtBlock(
                int.Parse(lines[0].Trim()),
                timing[0].Trim(),
                timing[1].Trim(),
                string.Join(" ", lines[2..])));
        }
        return blocks;
    }
}
