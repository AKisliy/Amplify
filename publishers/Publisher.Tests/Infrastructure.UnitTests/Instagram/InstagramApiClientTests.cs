using System.Net;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using FluentAssertions;
using Polly;
using Polly.Registry;
using Publisher.Application.Common.Models.Instagram;
using Publisher.Application.Common.Interfaces.Instagram;
using Publisher.Infrastructure.Instagram;
using Publisher.Application.Common.Interfaces;
using Publisher.Application.Common.Exceptions;
using Microsoft.AspNetCore.WebUtilities;

namespace Publisher.Tests.Infrastructure.UnitTests.Instagram;

public class InstagramApiClientTests
{
    private const string fakeUserId = "0";
    private const string fakeToken = "imFakeToken";
    private static readonly InstagramCredentials fakeCredentials = new(fakeUserId, fakeToken);

    [Fact]
    public async Task CreateReelContainerAsync_WhenCalled_InvokesContainerCreationUrl()
    {
        // Arrange
        var successResponse = GetSuccessInstagramResponseWithId();
        var mockHandler = SetupBasicResponse(successResponse);
        InstagramReelData fakeReelData = new("fakePath", "fakeDescr", "coverPath");

        var httpClient = new HttpClient(mockHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();

        var mockPipeline = GetEmptyPipeline();

        const string expectedUrl = "https://mock.url/media";
        var expectedContent = new StringContent("{}");

        urlBuilderMock.Setup(x => x.GetMediaCreationUrl(It.IsAny<string>())).Returns(expectedUrl);
        payloadBuilderMock.Setup(x => x.BuildReelCreationPayload(It.IsAny<InstagramReelData>(), It.IsAny<InstagramCredentials>()))
                          .Returns(expectedContent);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.CreateReelContainerAsync(fakeReelData, fakeCredentials);

        // Assert
        mockHandler
            .Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(
                        req => req.RequestUri != null &&
                        req.RequestUri.ToString() == expectedUrl
                ),
                ItExpr.IsAny<CancellationToken>()
            );
    }

    [Fact]
    public async Task CreatePostContainerAsync_Success_ReturnsInstagramApiResponseWithId()
    {
        // Arrange
        const string mockContainerId = "123";
        const string stubMediaCreationUrl = "http://example.com/media";
        var fakeSuccessResponse = GetSuccessInstagramResponseWithId(mockContainerId);
        var stubHttpMessageHandler = SetupBasicResponse(fakeSuccessResponse);

        var httpClient = new HttpClient(stubHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetMediaCreationUrl(It.IsAny<string>())).Returns(stubMediaCreationUrl);

        var reelData = new InstagramReelData("/videopath", "mock description", "/coverpath");

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.CreateReelContainerAsync(reelData, fakeCredentials);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(mockContainerId);
    }

    [Fact]
    public async Task CreatePostContainerAsync_Error_ReturnsInstagramApiResponseWithError()
    {
        // Arrange
        const string mockErrorMessage = "some error occured";
        var fakeResponseMessage = GetErrorInstagramResponseWithMessage(mockErrorMessage);
        var stubHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);

        const string mediaCreationUrl = "http://example.com/media";
        var httpClient = new HttpClient(stubHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetMediaCreationUrl(It.IsAny<string>())).Returns(mediaCreationUrl);

        var reelData = new InstagramReelData("/videopath", "mock description", "/coverpath");

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.CreateReelContainerAsync(reelData, fakeCredentials);

        // Assert
        result.Should().NotBeNull();
        result.Error.Should().NotBeNull();
        result.Error.Message.Should().Be(mockErrorMessage);
    }

    [Fact]
    public async Task CreatePostContainerAsync_WhenCalled_UsesPassedCredentials()
    {
        // Arrange
        var fakeSuccessResponseMessage = GetSuccessInstagramResponseWithId();
        var stubHttpMessageHandler = SetupBasicResponse(fakeSuccessResponseMessage);

        const string mediaCreationUrl = "http://example.com";
        var fakeContent = new StringContent("{}");
        var httpClient = new HttpClient(stubHttpMessageHandler.Object);
        var logger = new Mock<ILogger<InstagramApiClient>>().Object;
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetMediaCreationUrl(fakeCredentials.UserId)).Returns(mediaCreationUrl);
        payloadBuilderMock.Setup(x => x.BuildReelCreationPayload(It.IsAny<InstagramReelData>(), fakeCredentials))
                          .Returns(fakeContent);

        var reelData = new InstagramReelData("/videopath", "mock description", "/coverpath");

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.CreateReelContainerAsync(reelData, fakeCredentials);

        // Assert
        urlBuilderMock.Verify(ub => ub.GetMediaCreationUrl(fakeCredentials.UserId), Times.Once());
        payloadBuilderMock.Verify(pb => pb.BuildReelCreationPayload(It.IsAny<InstagramReelData>(), fakeCredentials), Times.Once());
    }

    [Fact]
    public async Task CreatePostContainerAsync_InstagramReturnsInvalidResponse_ThrowsInstagramException()

    {
        // Arrange
        var fakeSuccessResponseMessage = GetInvalidInstagramResponse();
        var stubHttpMessageHandler = SetupBasicResponse(fakeSuccessResponseMessage);

        const string mediaCreationUrl = "http://example.com";
        var fakeContent = new StringContent("{}");
        var httpClient = new HttpClient(stubHttpMessageHandler.Object);
        var logger = new Mock<ILogger<InstagramApiClient>>().Object;
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetMediaCreationUrl(fakeCredentials.UserId)).Returns(mediaCreationUrl);
        payloadBuilderMock.Setup(x => x.BuildReelCreationPayload(It.IsAny<InstagramReelData>(), fakeCredentials))
                          .Returns(fakeContent);

        var reelData = new InstagramReelData("/videopath", "mock description", "/coverpath");

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        Func<Task> act = async () => await client.CreateReelContainerAsync(reelData, fakeCredentials);

        // Assert
        await act.Should().ThrowAsync<InstagramException>();
    }

    [Fact]
    public async Task GetPostLink_WhenCalled_SendRequestForShortCode()
    {
        // Arrange
        const string fakeMediaId = "123";
        const string mockShortCode = "xhdf";
        var successResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent("{\"shortcode\" : \"" + mockShortCode + "\" }")
        };
        var mockHttpMessageHandler = SetupBasicResponse(successResponse);

        const string mockShortcodeUrl = "http://example.com/shortcode";
        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var logger = new Mock<ILogger<InstagramApiClient>>().Object;
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetUrlForShortcode(It.IsAny<string>(), It.IsAny<string>())).Returns(mockShortcodeUrl);

        var reelData = new InstagramReelData("/videopath", "mock description", "/coverpath");

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.GetPostLink(fakeMediaId, fakeToken);

        // Assert
        mockHttpMessageHandler.
            Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Get &&
                    req.RequestUri != null &&
                    req.RequestUri.ToString() == mockShortcodeUrl
                ),
                ItExpr.IsAny<CancellationToken>()
            );
    }

    [Fact]
    public async Task GetPostLink_InstagramReturnsNullInShortCode_ThrowsInstagramExceptionWithErrorDetail()
    {
        // Arrange
        const string fakeMediaId = "123";
        const string mockErrorMessage = "some error";
        var fakeResponseMessage = GetErrorInstagramResponseWithMessage(mockErrorMessage);
        var mockHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);

        const string mockShortcodeUrl = "http://example.com/shortcode";
        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var logger = new Mock<ILogger<InstagramApiClient>>().Object;
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetUrlForShortcode(It.IsAny<string>(), It.IsAny<string>())).Returns(mockShortcodeUrl);

        var reelData = new InstagramReelData("/videopath", "mock description", "/coverpath");

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        Func<Task> act = async () => await client.GetPostLink(fakeMediaId, fakeToken);

        // Assert
        await act.Should().ThrowAsync<InstagramException>()
            .Where(ex => ex.ErrorDetail != null
                && ex.ErrorDetail.Message == mockErrorMessage
            );
    }

    [Fact]
    public async Task GetPostLink_Success_ReturnsPostLink()
    {
        // Arrange
        const string fakeMediaId = "123";
        const string mockShortCode = "xhdf";
        var successResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent("{\"shortcode\" : \"" + mockShortCode + "\" }")
        };
        var mockHttpMessageHandler = SetupBasicResponse(successResponse);

        const string mockShortcodeUrl = "http://example.com/shortcode";
        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var logger = new Mock<ILogger<InstagramApiClient>>().Object;
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetUrlForShortcode(It.IsAny<string>(), It.IsAny<string>())).Returns(mockShortcodeUrl);
        urlBuilderMock.Setup(x => x.FormPostLink(mockShortCode)).Returns(mockShortCode);

        var reelData = new InstagramReelData("/videopath", "mock description", "/coverpath");

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.GetPostLink(fakeMediaId, fakeToken);

        // Assert
        result.Should().Be(mockShortCode);
    }

    [Fact]
    public async Task UploadVideoToContainerAsync_WhenCalled_InvokeUploadEndpoint()
    {
        // Arrange
        var fakeResponseMessage = GetSuccessInstagramResponseWithId();
        var mockHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);
        const string mockUploadEndpoint = "https://example.com/upload";
        const string fakeVideoPath = "/videopath";
        const string fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x => x.GetMediaResumableUploadUrl(It.IsAny<string>())).Returns(mockUploadEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        await client.UploadVideoToContainerAsync(fakeVideoPath, fakeToken, fakeCreationId);

        // Assert
        mockHttpMessageHandler
            .Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Post &&
                    req.RequestUri != null &&
                    req.RequestUri.ToString() == mockUploadEndpoint
                ),
                ItExpr.IsAny<CancellationToken>()
            );
    }

    [Fact]
    public async Task UploadVideoToContainerAsync_WhenCalled_CallsHeaderBuilderWithAppropriateArgs()
    {
        // Arrange
        var fakeResponseMessage = GetSuccessInstagramResponseWithId();
        var mockHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);
        const string mockUploadEndpoint = "https://example.com/upload";
        const string mockVideoPath = "/videopath";
        const string mockToken = "token";
        const string fakeCreationId = "123";
        const long mockFileSize = 0;

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock
            .Setup(x => x.GetMediaResumableUploadUrl(It.IsAny<string>()))
            .Returns(mockUploadEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        await client.UploadVideoToContainerAsync(mockVideoPath, mockToken, fakeCreationId);

        // Assert
        headerBuilderMock.Verify(x => x.AddResumableUploadHeaders(
            It.Is<HttpRequestMessage>(rm =>
                rm.Method == HttpMethod.Post &&
                rm.RequestUri != null &&
                rm.RequestUri.ToString() == mockUploadEndpoint),
            mockToken,
            mockFileSize,
            0
        ), Times.Once());
    }

    [Fact]
    public async Task UploadVideoToContainerAsync_InstagramReturnsSuccess_ReturnsResponseWithSuccess()
    {
        // Arrange
        var fakeResponseMessage = GetSuccessInstagramResponseWithSuccess();
        var mockHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);
        const string mockUploadEndpoint = "https://example.com/upload";
        const string mockVideoPath = "/videopath";
        const string mockToken = "token";
        const string fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock
            .Setup(x => x.GetMediaResumableUploadUrl(It.IsAny<string>()))
            .Returns(mockUploadEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.UploadVideoToContainerAsync(mockVideoPath, mockToken, fakeCreationId);

        // Assert
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task UploadVideoToContainerAsync_InstagramReturnsDebugInfo_ReturnsResponseWithDebugInfo()
    {
        // Arrange
        var mockRawMessage = "raw";
        var fakeResponseMessage = GetDebugInfoInstagramResponse(mockRawMessage);
        var mockHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);
        const string mockUploadEndpoint = "https://example.com/upload";
        const string mockVideoPath = "/videopath";
        const string mockToken = "token";
        const string fakeCreationId = "123";
        const long mockFileSize = 0;

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock
            .Setup(x => x.GetMediaResumableUploadUrl(It.IsAny<string>()))
            .Returns(mockUploadEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.UploadVideoToContainerAsync(mockVideoPath, mockToken, fakeCreationId);

        // Assert
        result.Success.Should().BeNull();
        result?.DebugInfo?.RawMessage.Should().Be(mockRawMessage);
    }

    [Fact]
    public async Task GetContainerStatus_WhenCalled_InvokesStatusEndpoint()
    {
        // Arrange
        var fakeResponseMessage = GetSuccessInstagramResponseWithId();
        var mockHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);
        const string mockStatusEndpoint = "https://example.com/status";
        const string fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x =>
            x.GetStatusUrl(
                fakeCreationId,
                fakeToken
            )).Returns(mockStatusEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        await client.GetContainerStatus(fakeCreationId, fakeToken);

        // Assert
        mockHttpMessageHandler
            .Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Get &&
                    req.RequestUri != null &&
                    req.RequestUri.ToString() == mockStatusEndpoint
                ),
                ItExpr.IsAny<CancellationToken>()
            );
    }

    [Fact]
    public async Task GetContainerStatus_SuccessInstagramResponse_ReturnsCorrectResponse()
    {
        // Arrange
        const string mockStatus = "FINISHED";
        var fakeResponseMessage = GetInstagramResponseWithContainerStatus(mockStatus);
        var mockHttpMessageHandler = SetupBasicResponse(fakeResponseMessage);
        const string mockStatusEndpoint = "https://example.com/status";
        const string fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x =>
            x.GetStatusUrl(
                It.IsAny<string>(),
                It.IsAny<string>()
            )).Returns(mockStatusEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.GetContainerStatus(fakeCreationId, fakeToken);

        // Assert
        result.StatusCode.Should().Be(mockStatus);
    }

    [Fact]
    public async Task GetContainerStatus_InstagramErrorResponse_ReturnsResponseWithError()
    {
        // Arrange
        const string mockErrorMessage = "error";
        var fakeErrorResponseMessage = GetErrorInstagramResponseWithMessage(mockErrorMessage);
        var mockHttpMessageHandler = SetupBasicResponse(fakeErrorResponseMessage);
        var fakeStatusEndpoint = "https://example.com/status";
        var fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x =>
            x.GetStatusUrl(
                It.IsAny<string>(),
                It.IsAny<string>()
            )).Returns(fakeStatusEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.GetContainerStatus(fakeCreationId, fakeToken);

        // Assert
        result.Error.Should().NotBeNull();
        result.Error.Message.Should().Be(mockErrorMessage);
    }

    [Fact]
    public async Task GetContainerStatus_InstagramInvalidResponse_ThrowsInstagramException()
    {
        // Arrange
        var fakeInvalidResponseMessage = GetInvalidInstagramResponse();
        var mockHttpMessageHandler = SetupBasicResponse(fakeInvalidResponseMessage);
        var fakeStatusEndpoint = "https://example.com/status";
        var fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x =>
            x.GetStatusUrl(
                It.IsAny<string>(),
                It.IsAny<string>()
            )).Returns(fakeStatusEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        Func<Task> act = async () => await client.GetContainerStatus(fakeCreationId, fakeToken);

        // Assert
        await act.Should().ThrowAsync<InstagramException>();
    }

    [Theory]
    [InlineData("EXPIRED")]
    [InlineData("ERROR")]
    [InlineData("FINISHED")]
    [InlineData("PUBLISHED")]
    public async Task WaitForContainerUploadAsync_NotInProgressStatusInResponse_ReturnsImmediately(string statusCode)
    {
        // Arrange
        var firstResponseMessage = GetInstagramResponseWithContainerStatus(statusCode);
        var secondResponseMessage = GetInstagramResponseWithContainerStatus(statusCode);
        var mockHttpMessageHandler = SetupSequenceOfResponses(firstResponseMessage, secondResponseMessage);
        var mockStatusEndpoint = "https://example.com/status";
        var fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x =>
            x.GetStatusUrl(
                It.IsAny<string>(),
                It.IsAny<string>()
            )).Returns(mockStatusEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.GetContainerStatus(fakeCreationId, fakeToken);

        // Assert
        mockHttpMessageHandler
            .Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Get &&
                    req.RequestUri != null &&
                    req.RequestUri.ToString() == mockStatusEndpoint
                ),
                ItExpr.IsAny<CancellationToken>()
        );
        result.StatusCode.Should().Be(statusCode);
    }

    [Fact]
    public async Task WaitForContainerUploadAsync_InstagramLongProcessing_ReturnsInstagramApiResponseWithError()
    {
        // Arrange
        var inProgressResponse = GetInstagramResponseWithContainerStatus("IN_PROGRESS");

        var mockHttpMessageHandler = SetupSequenceOfResponses(
            inProgressResponse
        );
        const string mockStatusEndpoint = "https://example.com/status";
        const string fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x =>
            x.GetStatusUrl(
                It.IsAny<string>(),
                It.IsAny<string>()
            )).Returns(mockStatusEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        var result = await client.GetContainerStatus(fakeCreationId, fakeToken);

        // Assert
        result?.Error?.Message.Should().NotBeNull();
    }

    [Fact]
    public async Task PublishAsync_WhenCalled_InvokesCorrectEndpoint()
    {
        // Arrange
        var fakeSuccessResponseMessage = GetSuccessInstagramResponseWithId();
        var mockHttpMessageHandler = SetupBasicResponse(fakeSuccessResponseMessage);
        const string mockPublishEndpoint = "https://example.com/publish";
        const string fakeCreationId = "123";

        var httpClient = new HttpClient(mockHttpMessageHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        urlBuilderMock.Setup(x =>
            x.GetPublishUrl(
                It.IsAny<string>()
            )).Returns(mockPublishEndpoint);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        await client.PublishAsync(fakeCredentials, fakeCreationId);

        // Assert
        mockHttpMessageHandler
            .Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Post &&
                    req.RequestUri != null &&
                    req.RequestUri.ToString() == mockPublishEndpoint
                ),
                ItExpr.IsAny<CancellationToken>()
        );
    }

    [Fact]
    public async Task PublishAsync_WhenCalled_AddsProvidedPayloadToRequestContent()
    {
        // Arrange
        HttpRequestMessage? capturedRequest = null;
        var fakeSuccessResponseMessage = GetSuccessInstagramResponseWithId();
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>(
                (request, _) => capturedRequest = request)
            .ReturnsAsync(fakeSuccessResponseMessage);

        const string mockPublishEndpoint = "https://example.com/publish";
        const string fakeCreationId = "123";
        const string mockToken = "token";
        var mockCredentials = new InstagramCredentials(fakeUserId, mockToken);
        const string mockTokenHeaderFieldName = "header";

        var httpClient = new HttpClient(mockHandler.Object);
        var urlBuilderMock = new Mock<IInstagramUrlBuilder>();
        var payloadBuilderMock = new Mock<IInstagramPayloadBuilder>();
        var headerBuilderMock = new Mock<IInstagramHeaderBuilder>();
        var fileStorageMock = new Mock<IFileStorage>();
        var mockPipeline = GetEmptyPipeline();

        var mockContent = new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                { mockTokenHeaderFieldName, mockToken }
            }
        );

        urlBuilderMock.Setup(x =>
            x.GetPublishUrl(
                It.IsAny<string>()
            )).Returns(mockPublishEndpoint);

        payloadBuilderMock
            .Setup(x =>
                x.BuildPublishPayload(fakeCreationId, mockToken))
            .Returns(mockContent);

        var client = new InstagramApiClient(
            httpClient,
            urlBuilderMock.Object,
            payloadBuilderMock.Object,
            headerBuilderMock.Object,
            mockPipeline.Object
        );

        // Act
        await client.PublishAsync(mockCredentials, fakeCreationId);

        // Assert
        capturedRequest?.Content.Should().NotBeNull();
        var content = await capturedRequest!.Content!.ReadAsStringAsync();

        var parsed = QueryHelpers.ParseQuery(content);
        parsed[mockTokenHeaderFieldName].Should().HaveCount(1).And.Contain(mockToken);
    }

    private HttpResponseMessage GetSuccessInstagramResponseWithId(string id = "0")
    {
        return new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent("{\"id\":\"" + id + "\"}")
        };
    }

    private HttpResponseMessage GetSuccessInstagramResponseWithSuccess()
    {
        return new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent("{\"success\":\"true\"}")
        };
    }

    private HttpResponseMessage GetErrorInstagramResponseWithMessage(string errorMessage = "error occured")
    {
        return new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.BadRequest,
            Content = new StringContent("{\"error\": { \"message\" : \"" + errorMessage + "\"}}")
        };
    }

    private HttpResponseMessage GetInstagramResponseWithContainerStatus(string status = "FINISHED")
    {
        return new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent("{\"status_code\": \"" + status + "\"}")
        };
    }

    private HttpResponseMessage GetDebugInfoInstagramResponse(string rawMessage)
    {
        return new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.BadRequest,
            Content = new StringContent(
                $$"""
                {
                  "debug_info": {
                    "retriable": "false",
                    "message": "{{rawMessage}}"
                  }
                }
                """
            )
        };
    }

    private HttpResponseMessage GetInvalidInstagramResponse()
    {
        return new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent("unknow response")
        };
    }

    private Mock<HttpMessageHandler> SetupBasicResponse(HttpResponseMessage response)
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(response);

        return mockHandler;
    }

    private Mock<HttpMessageHandler> SetupSequenceOfResponses(params HttpResponseMessage[] messages)
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new Queue<HttpResponseMessage>(messages).Dequeue);

        return mockHandler;
    }

    private Mock<ResiliencePipelineProvider<string>> GetEmptyPipeline()
    {
        var mockPipeline = new Mock<ResiliencePipelineProvider<string>>();
        mockPipeline
            .Setup(x => x.GetPipeline<InstagramApiResponse>(It.IsAny<string>()))
            .Returns(ResiliencePipeline<InstagramApiResponse>.Empty);
        return mockPipeline;
    }
}
