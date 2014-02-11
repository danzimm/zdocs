//
//  CWMagnifyingView.h
//  colorwheel
//
//  Created by Dan Zimmerman on 2/2/14.
//  Copyright (c) 2014 Dan Zimmerman. All rights reserved.
//

/*
 * @zdocs filedescription
 *
 * @title DZMagnifyingView Class Reference
 *
 * @#DZREADME.md
 *
 */

#import <UIKit/UIKit.h>

/*
 *
 * @zdocs class
 *
 */

@interface DZMagnifyingView : UIView {
    UIImage *fullImage;
    CGAffineTransform rotationTransform;
    BOOL animating;
    CALayer *imageLayer;
    CAShapeLayer *borderLayer;
    BOOL queueHide;
}
/*
 */
@property (nonatomic, readwrite) CGFloat closeupRadius;
/*
 */
@property (nonatomic) CGPoint closeupCenter;
/*
 */
@property (nonatomic) UIView *targetView;
/*
 */
- (void)show;
/**/
- (void)hide;
/**/
- (void)dosomething:(NSObject *)obja withAnotherString:(NSString *)str afterDelay:(CGFloat)flt;

@end

/*
 *
 * @parameter ctx={void *} Context of doing something.
 *
 * @parameter n={int} Some int.
 *
 * @parameter f={float} Some float.
 *
 * @parameter c={char} Some char.
 *
 * @parameter str={char *} Some char array.
 *
 * @description Yo yo yo I am a *G*
 *
 */
static void dosmth(void *ctx, int n, float f, char c, char *str);
/*
 */
static char *a;
/*
 */
const char c;
