
import os
import re
from PIL import Image, ImageFont, ImageDraw
from moviepy import ColorClip, CompositeVideoClip, ImageClip
import numpy as np



def getEmojiMask(font: ImageFont.ImageFont, emoji: str, size: tuple[int, int]) -> Image.Image:

    """ Makes an image with an emoji using AppleColorEmoji.ttf, this can then be pasted onto the image to show emojis
    Parameter:
    (ImageFont)font: The font with the emojis (AppleColorEmoji.ttf); Passed in so font is only loaded once
    (str)emoji: The unicoded emoji
    (tuple[int, int])size: The size of the mask
    Returns:
    (Image): A transparent image with the emoji
    """

    mask = Image.new("RGBA", (160, 160), color=(255, 255, 255, 0))
    draw = ImageDraw.Draw(mask)
    draw.text((0, 0), emoji, font=font, embedded_color=True)
    mask = mask.resize(size)

    return mask

def getDimensions(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> tuple[int, int]:
    """ Gets the size of text using the font
    Parameters:
    (ImageDraw): The draw object of the image
    (str)text: The text you are getting the size of
    (ImageFont)font: The font being used in drawing the text
    Returns:
    (tuple[int, int]): The width and height of the text
    """

    left, top, right, bottom = draw.multiline_textbbox((0, 0), text, font=font)
    return (right-left), (bottom-top)


def addEmojis(img: Image.Image, text: str, box: tuple[int, int], font: ImageFont.ImageFont, emojiFont: ImageFont.ImageFont) -> None:
    """ Adds emojis to the text
    Parameters:
    (Image)img: The image to paste the emojis onto
    (tuple[int, int])box: The (x,y) pair where the textbox is placed
    (ImageFont)font: The font of the text
    (ImageFont)emojiFont: The emoji's font
    """

    draw = ImageDraw.Draw(img)
    width, height = box

    # Now add any emojis that weren't embedded correctly
    text_lines = text.split("\n")
    for i, line in enumerate(text_lines):
        for j, char in enumerate(line):
            if (not char.isascii()):
                # Get the height of the text ABOVE the emoji in modifiedResponse
                aboveText = "\n".join(text_lines[:i])
                _, aboveTextHeight = getDimensions(draw, aboveText, font)

                # The height that we paste at is aboveTextHeight + height + (Some error)
                y = aboveTextHeight + height + 0

                # Get the length of the text on the line up to the emoji

                beforeLength, _ = getDimensions(draw, line[:j], font)

                # The x position is beforeLength + width
                x = width + beforeLength - 5

                # Create the mask; You might want to adjust the size parameter
                emojiMask = getEmojiMask(emojiFont, char, (37, 37))
                # Pate the mask onto the image
                img.paste(emojiMask, (int(x), int(y)), emojiMask)

def remove_emojis(text: str) -> str:
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F700-\U0001F77F"  # alchemical symbols
        u"\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
        u"\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
        u"\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
        u"\U0001FA00-\U0001FA6F"  # Chess Symbols
        u"\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
        u"\U00002702-\U000027B0"  # Dingbats
        u"\U000024C2-\U0001F251" 
        "]+", flags=re.UNICODE)
    return emoji_pattern.sub(r' ', text)

def get_png_from_text_with_emojis(text: str, size: tuple[int, int], output_path: str = "output.png") -> str:
    img = Image.new("RGBA", size, (0, 0, 0, 0))

    font = ImageFont.truetype("fonts/Mont-Regular.ttf", 40)

    emojiFont = ImageFont.truetype("fonts/AppleColorEmoji.ttf", 137)

    clean_text = remove_emojis(text)

    draw = ImageDraw.Draw(img)

    bbox = draw.textbbox((0, 0), clean_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (img.width - text_width) // 2
    y = (img.height - text_height) // 2

    draw.text((x, y), clean_text, fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0,0,0))

    addEmojis(img, text, (x, y), font, emojiFont)
    img.save(output_path)

    return output_path





def get_image_clip_from_text_with_emojis(text: str, size: tuple[int, int]) -> ImageClip:
    path = "output.png"

    path = get_png_from_text_with_emojis(text, size, path)

    caption_clip = ImageClip(path)

    os.remove(path)

    return caption_clip
