namespace Publisher.Domain.Events;

public class PublicationRecordCreated : BaseEvent
{
    public PublicationRecord PublicationRecord { get; }

    public PublicationRecordCreated(PublicationRecord publicationRecord)
    {
        PublicationRecord = publicationRecord;
    }
}
