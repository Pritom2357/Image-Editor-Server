import sys
import io
import base64
from rembg import remove
from PIL import Image

def remove_background(image_data):
    try:
        input_image = Image.open(io.BytesIO(image_data))
        output_image = remove(input_image)

        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format='PNG')
        output_buffer.seek(0)

        return output_buffer.getvalue()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None
    
if __name__ == "__main__":
    image_data = sys.stdin.buffer.read()
    result = remove_background(image_data)

    if result:
        sys.stdout.buffer.write(result)
    else:
        sys.exit(1)